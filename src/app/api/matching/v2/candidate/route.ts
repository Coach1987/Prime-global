import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { buildCandidateMatchInsight } from "@/lib/server/matching/engine-v2";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-matching-v2", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();

  const [{ data: candidate, error: candidateError }, { data: jobs, error: jobsError }] = await Promise.all([
    supabase.from("candidate_profiles").select("id, full_name, professional_title, country, city, settings").eq("auth_user_id", auth.userId).single(),
    supabase.from("jobs").select("id, title, country, city, department, required_skills, experience, education").eq("status", "published").order("publish_date", { ascending: false }).limit(200),
  ]);

  if (candidateError || !candidate) {
    return NextResponse.json({ success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Candidate profile missing" } }, { status: 404 });
  }

  if (jobsError) {
    return NextResponse.json({ success: false, error: { code: "JOBS_FETCH_FAILED", message: jobsError.message } }, { status: 500 });
  }

  const matches = (jobs ?? []).map((job) => ({ jobId: job.id, jobTitle: job.title, ...buildCandidateMatchInsight(candidate, job) })).sort((left, right) => right.compatibilityScore - left.compatibilityScore);

  if (matches.length > 0) {
    await supabase.from("matching_insights_v2").upsert(
      matches.slice(0, 25).map((item) => ({
        entity_type: "candidate",
        entity_id: candidate.id,
        target_id: item.jobId,
        compatibility_score: item.compatibilityScore,
        confidence_score: item.confidenceScore,
        strengths: item.strengths,
        risks: item.risks,
        recommendations: item.recommendations,
        explanation: item.explanation,
      })),
      { onConflict: "entity_type,entity_id,target_id" }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      bestMatches: matches.slice(0, 5),
      recommendedJobs: matches.slice(0, 20),
      generatedAt: new Date().toISOString(),
    },
  });
}
