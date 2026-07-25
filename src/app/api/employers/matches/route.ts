import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId, requireVerifiedEmployerStatus } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-matches-get", 90);
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

  const supabase = createSupabaseAdminClient();
  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, country, city, employment_type, experience, required_skills")
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false })
    .limit(300);

  if (jobsError) {
    return NextResponse.json(
      { success: false, error: { code: "JOBS_LOAD_FAILED", message: jobsError.message } },
      { status: 500 }
    );
  }

  const jobIds = (jobs ?? []).map((job) => String(job.id));
  if (jobIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        jobs: [],
        matches: [],
        candidates: [],
      },
    });
  }

  const { data: matches, error: matchesError } = await supabase
    .from("pgems_ai_smart_job_matches")
    .select("id, candidate_id, canonical_profile_id, job_id, review_status, match_category, overall_match_score, skills_score, experience_score, education_score, certification_score, language_score, location_score, availability_score, confidence_score, strengths, weaknesses, missing_skills, recommended_improvements, score_explanations, review_notes, matching_timestamp")
    .in("job_id", jobIds)
    .order("matching_timestamp", { ascending: false })
    .limit(800);

  if (matchesError) {
    return NextResponse.json(
      { success: false, error: { code: "MATCHES_LOAD_FAILED", message: matchesError.message } },
      { status: 500 }
    );
  }

  const canonicalIds = Array.from(
    new Set((matches ?? []).map((item) => String(item.canonical_profile_id)).filter((value) => value.length > 0))
  );

  const canonicalProfilesResult = canonicalIds.length
    ? await supabase
        .from("pgems_ai_candidate_canonical_profiles")
        .select("id, candidate_id, canonical_payload, created_at")
        .in("id", canonicalIds)
    : { data: [], error: null };

  if (canonicalProfilesResult.error) {
    return NextResponse.json(
      { success: false, error: { code: "CANONICAL_PROFILES_LOAD_FAILED", message: canonicalProfilesResult.error.message } },
      { status: 500 }
    );
  }

  const canonicalById = new Map((canonicalProfilesResult.data ?? []).map((item) => [String(item.id), item]));
  const jobsById = new Map((jobs ?? []).map((job) => [String(job.id), job]));

  const enrichedMatches = (matches ?? []).map((match) => {
    const job = jobsById.get(String(match.job_id));
    const canonical = canonicalById.get(String(match.canonical_profile_id));
    return {
      matchId: match.id,
      candidateId: match.candidate_id,
      canonicalProfileId: match.canonical_profile_id,
      canonicalProfile: canonical?.canonical_payload ?? null,
      jobId: match.job_id,
      jobTitle: job?.title ?? "Job",
      reviewStatus: match.review_status,
      matchCategory: match.match_category,
      overallMatchScore: match.overall_match_score,
      skillsScore: match.skills_score,
      experienceScore: match.experience_score,
      educationScore: match.education_score,
      certificationScore: match.certification_score,
      languageScore: match.language_score,
      locationScore: match.location_score,
      availabilityScore: match.availability_score,
      confidenceScore: match.confidence_score,
      strengths: match.strengths ?? [],
      weaknesses: match.weaknesses ?? [],
      missingSkills: match.missing_skills ?? [],
      recommendedImprovements: match.recommended_improvements ?? [],
      scoreExplanations: match.score_explanations ?? {},
      staffNotes: match.review_notes ?? null,
      matchingTimestamp: match.matching_timestamp,
    };
  });

  const jobSummaries = (jobs ?? []).map((job) => {
    const related = enrichedMatches.filter((match) => String(match.jobId) === String(job.id));
    const averageScore =
      related.length > 0
        ? Number((related.reduce((sum, row) => sum + Number(row.overallMatchScore ?? 0), 0) / related.length).toFixed(2))
        : 0;

    const recent = related
      .slice()
      .sort((left, right) => Date.parse(String(right.matchingTimestamp ?? "")) - Date.parse(String(left.matchingTimestamp ?? "")))[0];

    return {
      id: job.id,
      title: job.title,
      country: job.country,
      city: job.city,
      employmentType: job.employment_type,
      experience: job.experience,
      requiredSkills: job.required_skills ?? [],
      preferredSkills: recent?.recommendedImprovements ?? [],
      languages: recent?.canonicalProfile && Array.isArray((recent.canonicalProfile as Record<string, unknown>).languages)
        ? (recent.canonicalProfile as Record<string, unknown>).languages
        : [],
      aiJobAnalysis: {
        matchCount: related.length,
        averageMatchScore: averageScore,
        strongestSignals: recent?.strengths ?? [],
        riskSignals: recent?.weaknesses ?? [],
        lastMatchingTime: recent?.matchingTimestamp ?? null,
      },
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      jobs: jobSummaries,
      matches: enrichedMatches,
      candidates: Array.from(new Set(enrichedMatches.map((match) => String(match.candidateId)))),
    },
  });
}
