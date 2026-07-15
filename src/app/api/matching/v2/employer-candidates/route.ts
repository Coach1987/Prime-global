import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { buildEmployerMatchInsight } from "@/lib/server/matching/engine-v2";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-matching-v2", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json({ success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const [{ data: candidates, error: candidatesError }] = await Promise.all([
    supabase
      .from("candidate_public_profiles")
      .select("candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, expected_salary, ai_summary, profile_status, generated_at")
      .eq("profile_status", "approved")
      .order("generated_at", { ascending: false })
      .limit(300),
  ]);

  if (candidatesError) {
    return NextResponse.json({ success: false, error: { code: "CANDIDATES_FETCH_FAILED", message: candidatesError.message } }, { status: 500 });
  }

  const insights = (candidates ?? [])
    .map((candidate) => {
      const candidateAdapter = {
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
          experience: candidate.years_of_experience ?? null,
        },
      };

      return {
        candidateId: candidate.candidate_id,
        candidateName: candidate.candidate_reference ?? "PG Candidate",
        ...buildEmployerMatchInsight(employer, candidateAdapter),
      };
    })
    .sort((left, right) => right.compatibilityScore - left.compatibilityScore);

  if (insights.length > 0) {
    await supabase.from("matching_insights_v2").upsert(
      insights.slice(0, 25).map((item) => ({
        entity_type: "employer",
        entity_id: employer.id,
        target_id: item.candidateId,
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
      topCandidates: insights.slice(0, 10),
      generatedAt: new Date().toISOString(),
    },
  });
}
