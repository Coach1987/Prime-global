import { NextResponse } from "next/server";
import { candidateProfessionalProfileSchema } from "@/features/candidates/schemas/professional-profile";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { syncCandidatePortalAiWorkflow } from "@/lib/server/candidates/portal-ai-workflow";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

async function getCandidateId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-professional-profile-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const candidateId = await getCandidateId(auth.userId);
  if (!candidateId) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_professional_profiles")
    .select("*")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PROFILE_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  const [canonicalProfile, reviewStatus, confidence, reviewItems, canonicalTimeline] = await Promise.all([
    supabase
      .from("pgems_ai_candidate_canonical_profiles")
      .select("id, source_profile_id, canonical_payload, created_at, updated_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pgems_ai_candidate_review_statuses")
      .select("id, status, review_notes, created_at, updated_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pgems_ai_candidate_confidence_scores")
      .select("overall_confidence, skills_confidence, experience_confidence, education_confidence, certification_confidence, language_confidence, created_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pgems_ai_candidate_review_items")
      .select("id, item_type, severity, field_path, reason_code, status, created_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("pgems_ai_candidate_canonical_timeline_entries")
      .select("id, entry_type, title, description, start_date, end_date, verified, created_at")
      .eq("candidate_id", candidateId)
      .order("start_date", { ascending: true })
      .limit(200),
  ]);

  return NextResponse.json({
    success: true,
    data: data ?? null,
    intelligence: {
      canonicalProfile: canonicalProfile.data ?? null,
      reviewStatus: reviewStatus.data ?? null,
      confidence: confidence.data ?? null,
      missingInformation: (reviewItems.data ?? []).filter((item) => item.item_type === "missing_information"),
      reviewItems: reviewItems.data ?? [],
      canonicalTimeline: canonicalTimeline.data ?? [],
    },
  });
}

export async function PUT(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-professional-profile-put", 80);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const candidateId = await getCandidateId(auth.userId);
  if (!candidateId) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const parsed = await parseJsonBody(request, candidateProfessionalProfileSchema);
  if (parsed.error) return parsed.error;

  const input = parsed.data;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("candidate_professional_profiles")
    .upsert(
      {
        candidate_id: candidateId,
        photo_storage_path: input.photoStoragePath || null,
        headline: input.headline || null,
        biography: input.biography || null,
        experiences: input.experiences,
        education_entries: input.educationEntries,
        certificates: input.certificates,
        skills: input.skills,
        languages: input.languages,
        portfolio_url: input.portfolioUrl || null,
        linkedin_url: input.linkedInUrl || null,
        website_url: input.websiteUrl || null,
        availability: input.availability || null,
        salary_expectation: input.salaryExpectation ?? null,
        visa_status: input.visaStatus || null,
        driving_license: input.drivingLicense ?? null,
        nationality: input.nationality || null,
      },
      { onConflict: "candidate_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PROFILE_SAVE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  await syncCandidatePortalAiWorkflow({
    candidateId,
    authUserId: auth.userId,
    trigger: "profile_update",
  }).catch(() => undefined);

  return NextResponse.json({ success: true, data });
}
