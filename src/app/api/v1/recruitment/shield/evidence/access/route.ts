import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { parseJsonBody } from "@/lib/server/http";
import { createSupabasePhase10EvidenceRepository, recordPhase10EvidenceAccess } from "@/lib/server/phase10/evidence/index.ts";
import { evidenceAccessSchema } from "@/lib/server/phase10/evidence/schemas.ts";
import { requireEvidenceRouteContext } from "../_context";

export async function POST(request: Request) {
  const context = await requireEvidenceRouteContext(
    request,
    "evidence_access_log",
    "phase10 evidence access logging requires authorized Prime Global staff",
    "v1-phase10-evidence-access",
    100
  );
  if (context instanceof NextResponse) return context;

  const parsed = await parseJsonBody(request, evidenceAccessSchema);
  if (parsed.error) return parsed.error;

  const repository = createSupabasePhase10EvidenceRepository();
  const data = await recordPhase10EvidenceAccess(
    { repository },
    {
      actor: context.actor,
      evidenceCaseId: parsed.data.evidenceCaseId ?? null,
      evidenceEventId: parsed.data.evidenceEventId ?? null,
      accessAction: parsed.data.accessAction,
      reason: parsed.data.reason,
      policyName: parsed.data.policyName ?? context.policyName,
      policyVersion: parsed.data.policyVersion ?? context.policyVersion,
      metadata: parsed.data.metadata ?? {},
    }
  );

  await createAuditLog({
    actorAuthUserId: context.actor.actorId,
    actorRole: context.actor.actorRole,
    action: "phase10.evidence.access_audit.recorded",
    targetType: "shield_evidence_case",
    targetId: data.evidence_case_id,
    metadata: {
      requestId: context.actor.requestId,
      policyName: context.policyName,
      policyVersion: context.policyVersion,
      accessAction: data.access_action,
      accessDecision: data.access_decision,
      organizationId: context.actor.organization.organizationId,
      tenantId: context.actor.organization.tenantId,
    },
    ipAddress: context.actor.ipAddress,
    userAgent: context.actor.userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
