import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createAuditLog } from "@/lib/server/security/audit";
import {
  appendVerificationCaseAction,
  getVerificationCaseById,
  insertCandidateNotification,
  supersedeActiveCandidateDocuments,
  transitionVerificationCase,
  type CandidateVerificationCaseAction,
  type CandidateVerificationCaseStatus,
} from "@/lib/server/candidates/document-verification-workflow";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

const actionSchema = z.object({
  action: z.enum([
    "verified",
    "rejected",
    "request_new_document",
    "schedule_live_verification",
    "request_additional_evidence",
    "escalate_to_supervisor",
  ]),
  note: z.string().trim().min(5).max(2000),
  candidateMessage: z.string().trim().max(2000).optional(),
  requestedEvidence: z.array(z.string().trim().min(2).max(200)).optional(),
  assignedSupervisorId: z.string().uuid().optional(),
});

function mapActionToStatus(action: CandidateVerificationCaseAction): CandidateVerificationCaseStatus {
  if (action === "verified") return "verified";
  if (action === "rejected") return "rejected";
  if (action === "request_new_document") return "replacement_requested";
  if (action === "schedule_live_verification") return "live_verification_required";
  if (action === "request_additional_evidence") return "additional_evidence_requested";
  return "escalated";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "admin-candidate-document-cases-patch", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, actionSchema);
  if (parsed.error) return parsed.error;

  const { caseId } = await params;
  const existingCase = await getVerificationCaseById(caseId);
  if (!existingCase) {
    return NextResponse.json(
      { success: false, error: { code: "CASE_NOT_FOUND", message: "Verification case not found" } },
      { status: 404 }
    );
  }

  const action = parsed.data.action;
  const nextStatus = mapActionToStatus(action);
  const idempotencyKey = request.headers.get("x-idempotency-key")?.trim() || null;

  const supabase = createSupabaseAdminClient();
  const { data: latestAction } = await supabase
    .from("candidate_document_verification_case_actions")
    .select("id, action, new_status, actor_auth_user_id, metadata")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    idempotencyKey &&
    latestAction &&
    String(latestAction.actor_auth_user_id) === auth.userId &&
    String(latestAction.action) === action &&
    String(latestAction.new_status) === nextStatus &&
    typeof (latestAction.metadata as Record<string, unknown> | null)?.idempotencyKey === "string" &&
    String((latestAction.metadata as Record<string, unknown>).idempotencyKey) === idempotencyKey
  ) {
    return NextResponse.json({
      success: true,
      data: { caseId, status: nextStatus, idempotent: true },
    });
  }

  if (existingCase.status === nextStatus && !idempotencyKey) {
    return NextResponse.json({
      success: true,
      data: { caseId, status: nextStatus, idempotent: true },
    });
  }

  await transitionVerificationCase({
    caseId,
    newStatus: nextStatus,
    assignedReviewerId: auth.userId,
    assignedSupervisorId: parsed.data.assignedSupervisorId ?? null,
    requestedEvidence: parsed.data.requestedEvidence ?? undefined,
    candidateMessage: parsed.data.candidateMessage ?? null,
    internalNotes: parsed.data.note,
    resolution:
      action === "verified"
        ? "Document version verified by Prime Global reviewer"
        : action === "rejected"
          ? "Document version rejected by Prime Global reviewer"
          : null,
    escalationReason: action === "escalate_to_supervisor" ? parsed.data.note : null,
  });

  await appendVerificationCaseAction({
    caseId,
    verificationId: String(existingCase.verification_id ?? ""),
    documentVersionId: String(existingCase.document_version_id ?? ""),
    action,
    actorAuthUserId: auth.userId,
    previousStatus: (existingCase.status as CandidateVerificationCaseStatus) ?? "pending_manual_review",
    newStatus: nextStatus,
    note: parsed.data.note,
    metadata: {
      idempotencyKey,
      candidateMessage: parsed.data.candidateMessage ?? null,
      requestedEvidence: parsed.data.requestedEvidence ?? null,
      assignedSupervisorId: parsed.data.assignedSupervisorId ?? null,
      temporaryAuthorizationBoundary: "prime_global_roles_without_fine_grained_rbac",
      workflowReference:
        action === "schedule_live_verification"
          ? "protected_staff_supervision_required"
          : null,
    },
  });

  const { data: privateProfile } = await supabase
    .from("candidate_private_profiles")
    .select("candidate_id")
    .eq("candidate_id", existingCase.candidate_id)
    .maybeSingle();

  const { data: currentVersion } = await supabase
    .from("candidate_document_versions")
    .select("id, candidate_id, document_type")
    .eq("id", existingCase.document_version_id)
    .maybeSingle();

  if (action === "verified" && currentVersion?.id && currentVersion?.candidate_id && currentVersion?.document_type) {
    await supersedeActiveCandidateDocuments({
      candidateId: String(currentVersion.candidate_id),
      documentType: currentVersion.document_type as
        | "cv"
        | "diploma"
        | "certificate"
        | "supporting_document"
        | "additional_evidence",
      exceptVersionId: String(currentVersion.id),
    });
  }

  if (privateProfile?.candidate_id && (action === "verified" || action === "rejected")) {
    await supabase
      .from("candidate_document_versions")
      .update({
        verification_status: nextStatus,
        reviewer_decision: action,
        is_active: action === "verified",
        is_primary: action === "verified" && currentVersion?.document_type === "cv",
      })
      .eq("id", existingCase.document_version_id);
  }

  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("auth_user_id")
    .eq("id", existingCase.candidate_id)
    .maybeSingle();

  if (candidateProfile?.auth_user_id) {
    const body =
      parsed.data.candidateMessage ??
      (action === "verified"
        ? "Document verified"
        : action === "rejected"
          ? "Document could not be verified"
          : action === "request_new_document"
            ? "Please upload a replacement document"
            : action === "schedule_live_verification"
              ? "Live verification is required"
              : action === "request_additional_evidence"
                ? "Additional evidence is required"
                : "Document case escalated to supervisor");

    await insertCandidateNotification({
      authUserId: String(candidateProfile.auth_user_id),
      title: "Document verification update",
      body,
      entityType: "candidate_document_verification_case",
      entityId: String(existingCase.id),
    });
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "prime_global.candidate_document_verification_case.action",
    targetType: "candidate_document_verification_case",
    targetId: String(existingCase.id),
    metadata: {
      caseId,
      action,
      previousStatus: existingCase.status,
      newStatus: nextStatus,
      hasCandidateMessage: Boolean(parsed.data.candidateMessage),
      requestedEvidenceCount: parsed.data.requestedEvidence?.length ?? 0,
      assignedSupervisorId: parsed.data.assignedSupervisorId ?? null,
      temporaryAuthorizationBoundary: "prime_global_roles_without_fine_grained_rbac",
    },
  });

  return NextResponse.json({ success: true, data: { caseId, status: nextStatus } });
}
