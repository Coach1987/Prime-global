import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { parseJsonBody } from "@/lib/server/http";
import { appendPhase10EvidenceCorrection, createSupabasePhase10EvidenceRepository } from "@/lib/server/phase10/evidence/index.ts";
import { evidenceCorrectionSchema } from "@/lib/server/phase10/evidence/schemas.ts";
import { requireEvidenceRouteContext } from "../_context";

export async function POST(request: Request) {
  const context = await requireEvidenceRouteContext(
    request,
    "evidence_correction_append",
    "phase10 evidence correction requires authorized Prime Global staff",
    "v1-phase10-evidence-correction",
    80
  );
  if (context instanceof NextResponse) return context;

  const parsed = await parseJsonBody(request, evidenceCorrectionSchema);
  if (parsed.error) return parsed.error;

  const repository = createSupabasePhase10EvidenceRepository();
  const data = await appendPhase10EvidenceCorrection(
    { repository },
    {
      actor: context.actor,
      sourceEvidenceEventId: parsed.data.sourceEvidenceEventId,
      contentHash: parsed.data.contentHash,
      redactedExcerpt: parsed.data.redactedExcerpt ?? null,
      normalizedSummary: parsed.data.normalizedSummary ?? null,
      metadata: parsed.data.metadata ?? {},
    }
  );

  await createAuditLog({
    actorAuthUserId: context.actor.actorId,
    actorRole: context.actor.actorRole,
    action: "phase10.evidence.correction.appended",
    targetType: "shield_evidence_event",
    targetId: data.id,
    metadata: {
      requestId: context.actor.requestId,
      policyName: context.policyName,
      policyVersion: context.policyVersion,
      evidenceCaseId: data.evidence_case_id,
      sourceEventId: parsed.data.sourceEvidenceEventId,
      organizationId: context.actor.organization.organizationId,
      tenantId: context.actor.organization.tenantId,
    },
    ipAddress: context.actor.ipAddress,
    userAgent: context.actor.userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
