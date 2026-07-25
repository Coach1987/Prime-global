import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { syncCandidatePortalAiWorkflow } from "@/lib/server/candidates/portal-ai-workflow";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-matching-v2", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();

  const [{ data: candidate, error: candidateError }, { data: jobs, error: jobsError }] = await Promise.all([
    supabase.from("candidate_profiles").select("id, auth_user_id, full_name").eq("auth_user_id", auth.userId).single(),
    supabase
      .from("jobs")
      .select("id, title, country, city, employment_type, required_skills, education, experience")
      .eq("status", "published")
      .order("publish_date", { ascending: false })
      .limit(200),
  ]);

  if (candidateError || !candidate) {
    return NextResponse.json({ success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Candidate profile missing" } }, { status: 404 });
  }

  if (jobsError) {
    return NextResponse.json({ success: false, error: { code: "JOBS_FETCH_FAILED", message: jobsError.message } }, { status: 500 });
  }

  let smartMatches = await supabase
    .from("pgems_ai_smart_job_matches")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("matching_timestamp", { ascending: false })
    .limit(200);

  if ((smartMatches.data?.length ?? 0) === 0) {
    await syncCandidatePortalAiWorkflow({
      candidateId: String(candidate.id),
      authUserId: auth.userId,
      trigger: "matching_refresh",
    }).catch(() => undefined);

    smartMatches = await supabase
      .from("pgems_ai_smart_job_matches")
      .select("*")
      .eq("candidate_id", candidate.id)
      .order("matching_timestamp", { ascending: false })
      .limit(200);
  }

  const jobById = new Map((jobs ?? []).map((job) => [String(job.id), job]));
  const matches = (smartMatches.data ?? [])
    .map((entry) => {
      const job = jobById.get(String(entry.job_id));
      return {
        matchId: entry.id,
        jobId: entry.job_id,
        jobTitle: job?.title ?? String((entry.job_payload as Record<string, unknown>)?.title ?? "Job"),
        reviewStatus: entry.review_status,
        matchCategory: entry.match_category,
        overallMatchScore: entry.overall_match_score,
        skillsScore: entry.skills_score,
        experienceScore: entry.experience_score,
        educationScore: entry.education_score,
        certificationScore: entry.certification_score,
        languageScore: entry.language_score,
        locationScore: entry.location_score,
        availabilityScore: entry.availability_score,
        confidenceScore: entry.confidence_score,
        strengths: entry.strengths ?? [],
        weaknesses: entry.weaknesses ?? [],
        missingSkills: entry.missing_skills ?? [],
        recommendedImprovements: entry.recommended_improvements ?? [],
        scoreExplanations: entry.score_explanations ?? {},
        matchingTimestamp: entry.matching_timestamp,
      };
    })
    .sort((left, right) => Number(right.overallMatchScore) - Number(left.overallMatchScore));

  return NextResponse.json({
    success: true,
    data: {
      bestMatches: matches.slice(0, 5),
      recommendedJobs: matches.slice(0, 30),
      generatedAt: new Date().toISOString(),
    },
  });
}
