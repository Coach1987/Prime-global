import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { parseJsonBody } from "@/lib/server/http";
import { activatePhase10LegalHold, createSupabasePhase10EvidenceRepository } from "@/lib/server/phase10/evidence/index.ts";
import { evidenceLegalHoldSchema } from "@/lib/server/phase10/evidence/schemas.ts";
import { requireEvidenceRouteContext } from "../_context";

export async function POST(request: Request) {
  const context = await requireEvidenceRouteContext(
    request,
    "evidence_legal_hold_action",
    "phase10 legal hold action requires authorized Prime Global staff",
    "v1-phase10-evidence-legal-hold",
    60
  );
  if (context instanceof NextResponse) return context;

  const parsed = await parseJsonBody(request, evidenceLegalHoldSchema);
  if (parsed.error) return parsed.error;

  const repository = createSupabasePhase10EvidenceRepository();
  const data = await activatePhase10LegalHold(
    { repository },
    {
      actor: context.actor,
      evidenceCaseId: parsed.data.evidenceCaseId ?? null,
      evidenceEventId: parsed.data.evidenceEventId ?? null,
      reason: parsed.data.reason,
      legalHoldState: parsed.data.legalHoldState,
      metadata: parsed.data.metadata ?? {},
    }
  );

  await createAuditLog({
    actorAuthUserId: context.actor.actorId,
    actorRole: context.actor.actorRole,
    action: "phase10.evidence.legal_hold.updated",
    targetType: "shield_evidence_case",
    targetId: data.evidence_case_id,
    metadata: {
      requestId: context.actor.requestId,
      policyName: context.policyName,
      policyVersion: context.policyVersion,
      legalHoldState: parsed.data.legalHoldState,
      organizationId: context.actor.organization.organizationId,
      tenantId: context.actor.organization.tenantId,
    },
    ipAddress: context.actor.ipAddress,
    userAgent: context.actor.userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
