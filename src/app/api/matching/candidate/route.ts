import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { scoreCandidateAgainstJobs } from "@/lib/server/matching/engine";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-matching", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id, country, professional_title, settings")
    .eq("auth_user_id", auth.userId)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, country, education, experience, required_skills, salary_min, salary_max")
    .eq("status", "published")
    .order("publish_date", { ascending: false })
    .limit(200);

  if (jobsError) {
    return NextResponse.json(
      { success: false, error: { code: "JOBS_FETCH_FAILED", message: jobsError.message } },
      { status: 500 }
    );
  }

  const scored = scoreCandidateAgainstJobs(candidate, jobs ?? []);

  if (scored.length > 0) {
    await supabase.from("candidate_job_match_scores").upsert(
      scored.map((item) => ({
        candidate_id: candidate.id,
        job_id: item.jobId,
        match_score: item.matchScore,
        match_reasons: item.reasons,
      })),
      { onConflict: "candidate_id,job_id" }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      bestMatches: scored.slice(0, 5),
      recommendedJobs: scored.slice(0, 20),
      generatedAt: new Date().toISOString(),
    },
  });
}
