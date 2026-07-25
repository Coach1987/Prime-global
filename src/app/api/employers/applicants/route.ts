import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId, requireVerifiedEmployerStatus } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { sanitizeEmployerCandidateProfile } from "@/lib/server/candidates/employer-profile";

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

  const verificationGate = requireVerifiedEmployerStatus(employer.verification_status as string | null | undefined);
  if (verificationGate) return verificationGate;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = (url.searchParams.get("status") ?? "").trim().toLowerCase();
  const jobId = (url.searchParams.get("jobId") ?? "").trim();

  const supabase = createSupabaseAdminClient();
  let dbQuery = supabase
    .from("job_applications_v2")
    .select(
      "id, status, applied_at, updated_at, cover_letter, job_id, candidate_id, resume_id, jobs!inner(id, employer_id, title)"
    )
    .eq("jobs.employer_id", employer.id)
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

  const candidateIds = Array.from(new Set((data ?? []).map((item) => String(item.candidate_id ?? "")).filter(Boolean)));

  const { data: candidateProfiles, error: candidateProfilesError } = await supabase
    .from("candidate_public_profiles")
    .select(
      "candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, ai_summary, profile_status, generated_at"
    )
    .in("candidate_id", candidateIds)
    .eq("profile_status", "approved");

  if (candidateProfilesError) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICANTS_LOAD_FAILED", message: candidateProfilesError.message } },
      { status: 500 }
    );
  }

  const approvedByCandidateId = new Map(
    (candidateProfiles ?? []).map((profile) => [String(profile.candidate_id), profile])
  );

  const withApprovedProfiles = (data ?? []).filter((item) => approvedByCandidateId.has(String(item.candidate_id ?? "")));

  const filtered = query
    ? withApprovedProfiles.filter((item) => {
        const candidate = approvedByCandidateId.get(String(item.candidate_id ?? ""));
        const job = Array.isArray(item.jobs) ? item.jobs[0] : item.jobs;

        const fields = [candidate?.candidate_reference, candidate?.professional_title, job?.title, item.status]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        return fields.some((field) => field.includes(query));
      })
    : withApprovedProfiles;

  return NextResponse.json({
    success: true,
    data: (filtered ?? []).map((item) => {
      const candidate = approvedByCandidateId.get(String(item.candidate_id ?? ""));
      return {
        ...item,
        candidate_public_profiles: candidate ? sanitizeEmployerCandidateProfile(candidate as Record<string, unknown>) : null,
      };
    }),
  });
}
