import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { parseJsonBody } from "@/lib/server/http";
import { createSupabasePhase10EvidenceRepository, verifyPhase10EvidenceChain } from "@/lib/server/phase10/evidence/index.ts";
import { evidenceChainVerificationSchema } from "@/lib/server/phase10/evidence/schemas.ts";
import { requireEvidenceRouteContext } from "../_context";

export async function POST(request: Request) {
  const context = await requireEvidenceRouteContext(
    request,
    "evidence_chain_verification",
    "phase10 evidence chain verification requires authorized Prime Global staff",
    "v1-phase10-evidence-verify-chain",
    90
  );
  if (context instanceof NextResponse) return context;

  const parsed = await parseJsonBody(request, evidenceChainVerificationSchema);
  if (parsed.error) return parsed.error;

  const repository = createSupabasePhase10EvidenceRepository();
  const data = await verifyPhase10EvidenceChain({ repository }, parsed.data.evidenceCaseId);

  await createAuditLog({
    actorAuthUserId: context.actor.actorId,
    actorRole: context.actor.actorRole,
    action: "phase10.evidence.chain.verified",
    targetType: "shield_evidence_case",
    targetId: parsed.data.evidenceCaseId,
    metadata: {
      requestId: context.actor.requestId,
      policyName: context.policyName,
      policyVersion: context.policyVersion,
      isValid: data.isValid,
      mismatchCount: data.mismatchCount,
      verifiedEventCount: data.verifiedEventCount,
      organizationId: context.actor.organization.organizationId,
      tenantId: context.actor.organization.tenantId,
    },
    ipAddress: context.actor.ipAddress,
    userAgent: context.actor.userAgent,
  });

  return NextResponse.json({ success: true, data });
}
