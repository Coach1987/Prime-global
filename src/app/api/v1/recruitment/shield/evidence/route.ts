import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import {
  createSupabasePhase10EvidenceRepository,
  lookupPhase10Evidence,
  recordPhase10EvidenceAccess,
} from "@/lib/server/phase10/evidence/index.ts";
import { evidenceLookupQuerySchema } from "@/lib/server/phase10/evidence/schemas.ts";
import { requireEvidenceRouteContext } from "./_context";

function parseLookupQuery(request: Request) {
  const url = new URL(request.url);
  const query = {
    evidenceCaseId: url.searchParams.get("evidenceCaseId") ?? undefined,
    evidenceEventId: url.searchParams.get("evidenceEventId") ?? undefined,
  };
  return evidenceLookupQuerySchema.safeParse(query);
}

export async function GET(request: Request) {
  const context = await requireEvidenceRouteContext(
    request,
    "evidence_lookup",
    "phase10 evidence lookup requires authorized Prime Global staff",
    "v1-phase10-evidence-lookup",
    120
  );
  if (context instanceof NextResponse) return context;

  const parsed = parseLookupQuery(request);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid evidence lookup query",
        },
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const repository = createSupabasePhase10EvidenceRepository();
  const event = parsed.data.evidenceEventId
    ? await repository.findEvidenceEventById(parsed.data.evidenceEventId)
    : null;
  const evidenceCaseId = parsed.data.evidenceCaseId ?? event?.evidence_case_id;

  if (!evidenceCaseId) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EVIDENCE_CASE_REQUIRED",
          message: "Provide evidenceCaseId or evidenceEventId",
        },
      },
      { status: 400 }
    );
  }

  const data = await lookupPhase10Evidence({ repository }, evidenceCaseId);

  await recordPhase10EvidenceAccess(
    { repository },
    {
      actor: context.actor,
      evidenceCaseId,
      evidenceEventId: parsed.data.evidenceEventId ?? null,
      accessAction: "lookup",
      reason: "Authorized evidence lookup",
      policyName: context.policyName,
      policyVersion: context.policyVersion,
      metadata: {
        eventCount: data.events.length,
      },
    }
  );

  await createAuditLog({
    actorAuthUserId: context.actor.actorId,
    actorRole: context.actor.actorRole,
    action: "phase10.evidence.lookup",
    targetType: "shield_evidence_case",
    targetId: evidenceCaseId,
    metadata: {
      requestId: context.actor.requestId,
      policyName: context.policyName,
      policyVersion: context.policyVersion,
      organizationId: context.actor.organization.organizationId,
      tenantId: context.actor.organization.tenantId,
      eventCount: data.events.length,
    },
    ipAddress: context.actor.ipAddress,
    userAgent: context.actor.userAgent,
  });

  return NextResponse.json({
    success: true,
    data,
  });
}
