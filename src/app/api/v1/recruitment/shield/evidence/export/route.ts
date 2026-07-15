import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { parseJsonBody } from "@/lib/server/http";
import { createSupabasePhase10EvidenceRepository, requestPhase10ExportAuthorization } from "@/lib/server/phase10/evidence/index.ts";
import { evidenceExportSchema } from "@/lib/server/phase10/evidence/schemas.ts";
import { requireEvidenceRouteContext } from "../_context";

export async function POST(request: Request) {
  const context = await requireEvidenceRouteContext(
    request,
    "evidence_export_request",
    "phase10 evidence export authorization requires authorized Prime Global staff",
    "v1-phase10-evidence-export",
    60
  );
  if (context instanceof NextResponse) return context;

  const parsed = await parseJsonBody(request, evidenceExportSchema);
  if (parsed.error) return parsed.error;

  const repository = createSupabasePhase10EvidenceRepository();
  const data = await requestPhase10ExportAuthorization(
    { repository },
    {
      actor: context.actor,
      evidenceCaseId: parsed.data.evidenceCaseId ?? null,
      evidenceEventId: parsed.data.evidenceEventId ?? null,
      reason: parsed.data.reason,
      metadata: parsed.data.metadata ?? {},
    }
  );

  await createAuditLog({
    actorAuthUserId: context.actor.actorId,
    actorRole: context.actor.actorRole,
    action: "phase10.evidence.export.requested",
    targetType: "shield_evidence_case",
    targetId: data.evidence_case_id,
    metadata: {
      requestId: context.actor.requestId,
      policyName: context.policyName,
      policyVersion: context.policyVersion,
      organizationId: context.actor.organization.organizationId,
      tenantId: context.actor.organization.tenantId,
      eventId: data.id,
    },
    ipAddress: context.actor.ipAddress,
    userAgent: context.actor.userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
