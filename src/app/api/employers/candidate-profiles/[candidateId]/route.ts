import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "employer-candidate-profile-get", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  if (auth.role === "employer") {
    const employer = await getEmployerByAuthUserId(auth.userId);
    if (!employer) {
      return NextResponse.json(
        { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
        { status: 404 }
      );
    }
  }

  const { candidateId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_public_profiles")
    .select(
      "candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, expected_salary, ai_summary, profile_status, generated_at"
    )
    .eq("candidate_id", candidateId)
    .eq("profile_status", "approved")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILE_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? null });
}
