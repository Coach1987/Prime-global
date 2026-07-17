import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { isValidE164 } from "@/lib/utils/phone";

export type CandidateProfileRequirementKey =
  | "cv"
  | "diploma"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "languages"
  | "country"
  | "phone";

export interface CandidateProfileRequirement {
  key: CandidateProfileRequirementKey;
  completed: boolean;
}

export interface CandidateProfileCompletionResult {
  completed: boolean;
  completionPercent: number;
  requirements: CandidateProfileRequirement[];
  missing: CandidateProfileRequirementKey[];
}

export async function evaluateCandidateProfileCompletion(authUserId: string): Promise<CandidateProfileCompletionResult> {
  const supabase = createSupabaseAdminClient();

  const { data: candidateProfile, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id, country, phone_number, bio")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (candidateError || !candidateProfile?.id) {
    return {
      completed: false,
      completionPercent: 0,
      requirements: [
        "cv",
        "diploma",
        "summary",
        "skills",
        "experience",
        "education",
        "languages",
        "country",
        "phone",
      ].map((key) => ({ key: key as CandidateProfileRequirementKey, completed: false })),
      missing: ["cv", "diploma", "summary", "skills", "experience", "education", "languages", "country", "phone"],
    };
  }

  const candidateId = String(candidateProfile.id);

  const [resumesResult, professionalResult, privateProfileResult] = await Promise.all([
    supabase.from("candidate_resumes").select("id").eq("candidate_id", candidateId).limit(1),
    supabase
      .from("candidate_professional_profiles")
      .select("biography, skills, experiences, education_entries, certificates, languages")
      .eq("candidate_id", candidateId)
      .maybeSingle(),
    supabase
      .from("candidate_private_profiles")
      .select("original_documents_paths, identity_verification_status")
      .eq("candidate_id", candidateId)
      .maybeSingle(),
  ]);

  const professional = (professionalResult.data ?? null) as Record<string, unknown> | null;
  const privateProfile = (privateProfileResult.data ?? null) as Record<string, unknown> | null;

  const verificationStatus =
    typeof privateProfile?.identity_verification_status === "string"
      ? privateProfile.identity_verification_status
      : null;
  const isIdentityApproved = verificationStatus === "approved" || verificationStatus === null;

  const hasCv = !resumesResult.error && (resumesResult.data?.length ?? 0) > 0 && isIdentityApproved;
  const documents = Array.isArray(privateProfile?.original_documents_paths)
    ? (privateProfile?.original_documents_paths as unknown[])
    : [];
  const certificates = Array.isArray(professional?.certificates) ? (professional?.certificates as unknown[]) : [];
  const hasDiploma = (documents.length > 0 || certificates.length > 0) && isIdentityApproved;
  const hasSummary =
    typeof professional?.biography === "string"
      ? professional.biography.trim().length >= 20
      : typeof candidateProfile.bio === "string"
        ? candidateProfile.bio.trim().length >= 20
        : false;
  const hasSkills = Array.isArray(professional?.skills) && professional.skills.length > 0;
  const hasExperience = Array.isArray(professional?.experiences) && professional.experiences.length > 0;
  const hasEducation = Array.isArray(professional?.education_entries) && professional.education_entries.length > 0;
  const hasLanguages = Array.isArray(professional?.languages) && professional.languages.length > 0;
  const hasCountry = typeof candidateProfile.country === "string" && candidateProfile.country.trim().length > 0;
  const hasPhone = isValidE164(typeof candidateProfile.phone_number === "string" ? candidateProfile.phone_number : "");

  const requirements: CandidateProfileRequirement[] = [
    { key: "cv", completed: hasCv },
    { key: "diploma", completed: hasDiploma },
    { key: "summary", completed: hasSummary },
    { key: "skills", completed: hasSkills },
    { key: "experience", completed: hasExperience },
    { key: "education", completed: hasEducation },
    { key: "languages", completed: hasLanguages },
    { key: "country", completed: hasCountry },
    { key: "phone", completed: hasPhone },
  ];

  const completedCount = requirements.filter((item) => item.completed).length;
  const completionPercent = Math.round((completedCount / requirements.length) * 100);
  const missing = requirements.filter((item) => !item.completed).map((item) => item.key);

  return {
    completed: missing.length === 0,
    completionPercent,
    requirements,
    missing,
  };
}
