import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { enforceRateLimit, getRequestContext } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/security/auth";
import { createPhase10OrganizationContext } from "@/lib/server/phase10/organization/index.ts";
import { createPhase10PolicyContext } from "@/lib/server/phase10/policy-engine/index.ts";
import { evaluatePhase10EvidencePolicy } from "@/lib/server/phase10/evidence/policies.ts";
import type { Phase10EvidenceActorContext } from "@/lib/server/phase10/evidence/types.ts";

export interface EvidenceRequestContext {
  actor: Phase10EvidenceActorContext;
  policyName: string;
  policyVersion: string;
}

export async function requireEvidenceRouteContext(
  request: Request,
  action: string,
  policyName: string,
  rateLimitKey: string,
  maxRequests = 80
): Promise<EvidenceRequestContext | NextResponse> {
  const rateLimitResult = enforceRateLimit(request, rateLimitKey, maxRequests);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const requestContext = getRequestContext(request);
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const organization = createPhase10OrganizationContext();

  const policyContext = createPhase10PolicyContext({
    actorId: auth.userId,
    actorRole: auth.role,
    action,
    organization,
    facts: {
      requestId,
      requestPath: new URL(request.url).pathname,
    },
  });

  const policyDecision = evaluatePhase10EvidencePolicy(action, policyContext, policyName);
  const policyVersion = policyDecision.matchedPolicies[0]?.policy.version ?? "1.0.0";

  if (!policyDecision.allowed) {
    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: `phase10.evidence.${action}.denied`,
      targetType: "shield_evidence",
      targetId: undefined,
      metadata: {
        requestId,
        organizationId: organization.organizationId,
        tenantId: organization.tenantId,
        policyName,
        policyVersion,
        blockingReasons: policyDecision.blockingReasons,
      },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EVIDENCE_ACCESS_DENIED",
          message: policyDecision.explanation,
        },
      },
      { status: 403 }
    );
  }

  return {
    actor: {
      actorId: auth.userId,
      actorRole: auth.role,
      organization,
      requestId,
      userAgent: requestContext.userAgent,
      ipAddress: requestContext.ipAddress,
    },
    policyName,
    policyVersion,
  };
}
