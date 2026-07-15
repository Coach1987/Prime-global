import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { createAuditLog } from "@/lib/server/security/audit";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-candidate-profiles-get", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("candidate_public_profiles")
    .select(
      "candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, expected_salary, ai_summary, profile_status, generated_at, updated_at, candidate_private_profiles!inner(full_name, email, phone, address, original_cv_path, original_documents_paths, restricted_to_prime_global, created_at, updated_at), candidate_profile_reviews(id, status, notes, reviewed_by_prime_global_user_id, reviewed_at, created_at), candidate_profile_versions(id, version_number, generated_content, generated_by, created_at)"
    )
    .order("generated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("profile_status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILES_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "prime_global.candidate_private_profiles.list",
    targetType: "candidate_private_profiles",
    metadata: { status: status ?? "all", count: data?.length ?? 0 },
  });

  return NextResponse.json({ success: true, data: data ?? [] });
}
