export const EMPLOYER_CANDIDATE_PROFILE_SELECT =
  "candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, ai_summary, prime_global_verification_status, generated_at, updated_at";

const CONTACT_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+?\d[\d\s().-]{6,}\d)|(?:wa\.me\/[\w/-]+|whatsapp\S+)|(?:t\.me\/[\w/-]+|telegram\S+)|(?:@\w{3,}|linkedin\.com\/[\w./-]+|facebook\.com\/[\w./-]+|instagram\.com\/[\w./-]+)|https?:\/\/[\w.-]+(?:\/[\w./?%&=-]*)?)/gi;

function stripContact(value: string) {
  return value.replace(CONTACT_PATTERN, "[redacted]").trim();
}

function sanitizeArray(values: unknown) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => (typeof entry === "string" ? stripContact(entry) : entry))
    .filter(Boolean);
}

export function sanitizeEmployerCandidateProfile<T extends Record<string, unknown>>(profile: T) {
  return {
    ...profile,
    professional_summary:
      typeof profile.professional_summary === "string"
        ? stripContact(profile.professional_summary)
        : profile.professional_summary,
    ai_summary:
      typeof profile.ai_summary === "string" ? stripContact(profile.ai_summary) : profile.ai_summary,
    skills: sanitizeArray(profile.skills),
    languages: sanitizeArray(profile.languages),
  };
}

export function sanitizeEmployerCandidateProfiles<T extends Record<string, unknown>>(profiles: T[]) {
  return profiles.map((profile) => sanitizeEmployerCandidateProfile(profile));
}