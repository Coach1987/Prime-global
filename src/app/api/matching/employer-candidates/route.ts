import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { recommendCandidatesForEmployer } from "@/lib/server/matching/employer-recommendations";
import { sanitizeEmployerCandidateProfiles } from "@/lib/server/candidates/employer-profile";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-candidate-matching", 90);
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

  const supabase = createSupabaseAdminClient();
  const [{ data: jobs, error: jobsError }, { data: candidates, error: candidatesError }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, country, required_skills")
      .eq("employer_id", employer.id)
      .in("status", ["published", "paused", "draft"])
      .limit(200),
    supabase
      .from("candidate_public_profiles")
      .select("candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, ai_summary, profile_status, generated_at")
      .eq("profile_status", "approved")
      .order("generated_at", { ascending: false })
      .limit(500),
  ]);

  if (jobsError || candidatesError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RECOMMENDATIONS_LOAD_FAILED",
          message: jobsError?.message ?? candidatesError?.message ?? "Unable to load recommendations",
        },
      },
      { status: 500 }
    );
  }

  const recommendations = recommendCandidatesForEmployer(
    jobs ?? [],
    sanitizeEmployerCandidateProfiles((candidates ?? []) as Array<Record<string, unknown>>).map((candidate) => ({
      id: String(candidate.candidate_id),
      full_name: String(candidate.candidate_reference ?? "PG Candidate"),
      professional_title: candidate.professional_title ?? null,
      country: candidate.general_location ?? null,
      city: candidate.general_location ?? null,
      settings: {
        skills: candidate.skills ?? [],
        languages: candidate.languages ?? [],
        certifications: candidate.certifications ?? [],
        availability: candidate.availability ?? null,
      },
      updated_at: String(candidate.generated_at ?? new Date().toISOString()),
    }))
  );

  return NextResponse.json({
    success: true,
    data: {
      ...recommendations,
      generatedAt: new Date().toISOString(),
    },
  });
}
