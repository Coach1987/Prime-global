import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-applicants-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = (url.searchParams.get("status") ?? "").trim().toLowerCase();
  const jobId = (url.searchParams.get("jobId") ?? "").trim();

  const supabase = createSupabaseAdminClient();
  let dbQuery = supabase
    .from("job_applications_v2")
    .select(
      "id, status, applied_at, updated_at, cover_letter, job_id, candidate_id, resume_id, jobs!inner(id, employer_id, title), candidate_public_profiles!inner(candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, expected_salary, ai_summary, profile_status, generated_at)"
    )
    .eq("jobs.employer_id", employer.id)
    .eq("candidate_public_profiles.profile_status", "approved")
    .order("applied_at", { ascending: false });

  if (status) {
    dbQuery = dbQuery.eq("status", status);
  }

  if (jobId) {
    dbQuery = dbQuery.eq("job_id", jobId);
  }

  const { data, error } = await dbQuery;

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICANTS_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  const filtered = query
    ? data.filter((item) => {
        const candidate = Array.isArray(item.candidate_public_profiles)
          ? item.candidate_public_profiles[0]
          : item.candidate_public_profiles;
        const job = Array.isArray(item.jobs) ? item.jobs[0] : item.jobs;

        const fields = [candidate?.candidate_reference, candidate?.professional_title, job?.title, item.status]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return fields.some((field) => field.includes(query));
      })
    : data;

  return NextResponse.json({ success: true, data: filtered });
}
