import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createAuditLog } from "@/lib/server/security/audit";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

const profileUpdateSchema = z.object({
  action: z.enum(["approve", "reject", "needs_changes", "regenerate"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  profilePatch: z
    .object({
      professionalTitle: z.string().trim().max(180).optional().nullable(),
      professionalSummary: z.string().trim().max(4000).optional().nullable(),
      yearsOfExperience: z.number().min(0).max(80).optional().nullable(),
      skills: z.array(z.string().trim().min(1).max(80)).optional(),
      employmentHistory: z.array(z.record(z.string(), z.unknown())).optional(),
      education: z.array(z.record(z.string(), z.unknown())).optional(),
      certifications: z.array(z.record(z.string(), z.unknown())).optional(),
      languages: z.array(z.string().trim().min(1).max(80)).optional(),
      generalLocation: z.string().trim().max(160).optional().nullable(),
      availability: z.string().trim().max(160).optional().nullable(),
      desiredRole: z.string().trim().max(160).optional().nullable(),
      expectedSalary: z.number().min(0).optional().nullable(),
      aiSummary: z.string().trim().max(2000).optional().nullable(),
      profileStatus: z.enum(["draft", "pending_review", "needs_changes", "approved", "rejected"]).optional(),
    })
    .optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "admin-candidate-profile-get", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const { candidateId } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("candidate_public_profiles")
    .select(
      "candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, expected_salary, ai_summary, profile_status, generated_at, updated_at, candidate_private_profiles!inner(full_name, email, phone, address, original_cv_path, original_documents_paths, restricted_to_prime_global, identity_verification_status, identity_verification_confidence, identity_verification_reasoning, identity_staff_review_status, identity_verification_updated_at, created_at, updated_at), candidate_profile_reviews(id, status, notes, reviewed_by_prime_global_user_id, reviewed_at, created_at), candidate_profile_versions(id, version_number, generated_content, generated_by, created_at)"
    )
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILE_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "prime_global.candidate_private_profiles.view",
    targetType: "candidate_private_profile",
    targetId: candidateId,
  });

  const [versionsResult, verificationsResult, casesResult, caseActionsResult] = await Promise.all([
    supabase
      .from("candidate_document_versions")
      .select("id, document_type, version_number, original_filename, verification_status, reviewer_decision, identity_confidence_score, fraud_risk_score, verification_provider, verification_model, external_verification_status, is_active, is_primary, created_at, superseded_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("candidate_document_identity_verifications")
      .select("id, source, verification_decision, confidence_score, identity_confidence_score, fraud_risk_score, fraud_risk_band, high_fraud_override_applied, verification_provider, verification_model, ai_reasoning_summary, identity_reasoning_summary, fraud_reasoning_summary, extracted_identity_fields, detected_fraud_signals, strong_evidence_signals, extracted_verification_references, external_verification_status, has_external_verification_reference, staff_review_status, created_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("candidate_document_verification_cases")
      .select("id, document_version_id, verification_id, status, priority, assigned_reviewer_id, assigned_supervisor_id, requested_evidence, candidate_message, internal_notes, resolution, escalation_reason, created_at, updated_at, resolved_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("candidate_document_verification_case_actions")
      .select("id, case_id, verification_id, document_version_id, action, actor_auth_user_id, previous_status, new_status, note, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const caseIds = new Set((casesResult.data ?? []).map((entry) => String(entry.id)));
  const caseActions = (caseActionsResult.data ?? []).filter((entry) => caseIds.has(String(entry.case_id)));

  return NextResponse.json({
    success: true,
    data: data ?? null,
    documentVersions: versionsResult.data ?? [],
    documentVerifications: verificationsResult.data ?? [],
    documentVerificationCases: casesResult.data ?? [],
    documentVerificationCaseActions: caseActions,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "admin-candidate-profile-patch", 45);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, profileUpdateSchema);
  if (parsed.error) return parsed.error;

  const { candidateId } = await params;
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const action = parsed.data.action ?? "needs_changes";

  if (parsed.data.profilePatch) {
    const patch = parsed.data.profilePatch;
    await supabase
      .from("candidate_public_profiles")
      .update({
        professional_title: patch.professionalTitle ?? undefined,
        professional_summary: patch.professionalSummary ?? undefined,
        years_of_experience: patch.yearsOfExperience ?? undefined,
        skills: patch.skills ?? undefined,
        employment_history: patch.employmentHistory ?? undefined,
        education: patch.education ?? undefined,
        certifications: patch.certifications ?? undefined,
        languages: patch.languages ?? undefined,
        general_location: patch.generalLocation ?? undefined,
        availability: patch.availability ?? undefined,
        desired_role: patch.desiredRole ?? undefined,
        expected_salary: patch.expectedSalary ?? undefined,
        ai_summary: patch.aiSummary ?? undefined,
        profile_status: patch.profileStatus ?? undefined,
        updated_at: now,
      })
      .eq("candidate_id", candidateId);
  }

  const nextStatus =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : action === "regenerate"
          ? "pending_review"
          : "needs_changes";

  await supabase.from("candidate_profile_reviews").insert({
    candidate_id: candidateId,
    reviewed_by_prime_global_user_id: auth.userId,
    status: nextStatus,
    notes: parsed.data.notes ?? null,
    reviewed_at: now,
  });

  await supabase
    .from("candidate_public_profiles")
    .update({ profile_status: nextStatus, updated_at: now })
    .eq("candidate_id", candidateId);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "prime_global.candidate_private_profiles.update",
    targetType: "candidate_private_profile",
    targetId: candidateId,
    metadata: {
      action,
      notes: parsed.data.notes ?? null,
    },
  });

  return NextResponse.json({ success: true, data: { candidateId, status: nextStatus } });
}
