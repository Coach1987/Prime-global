const TEST_CANDIDATE_TOKEN = /(^|[^a-z0-9])(test|demo|dummy|sample|mock|sandbox|seed|qa|staging)([^a-z0-9]|$)/i;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasTestToken(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  return TEST_CANDIDATE_TOKEN.test(normalized);
}

export function isLikelyTestCandidateRecord(record: Record<string, unknown>) {
  const privateProfile = Array.isArray(record.candidate_private_profiles)
    ? (record.candidate_private_profiles[0] as Record<string, unknown> | undefined)
    : undefined;

  return [
    record.candidate_reference,
    record.professional_title,
    record.professional_summary,
    record.desired_role,
    record.general_location,
    privateProfile?.full_name,
    privateProfile?.email,
    privateProfile?.phone,
  ].some((value) => hasTestToken(value));
}