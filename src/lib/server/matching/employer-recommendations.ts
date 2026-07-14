interface CandidateRecord {
  id: string;
  full_name: string;
  professional_title: string | null;
  country: string | null;
  city: string | null;
  settings: Record<string, unknown> | null;
  updated_at: string;
}

interface JobRecord {
  id: string;
  title: string;
  country: string;
  required_skills: string[];
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);
}

export function recommendCandidatesForEmployer(jobs: JobRecord[], candidates: CandidateRecord[]) {
  const aggregatedSkills = Array.from(
    new Set(jobs.flatMap((job) => (job.required_skills ?? []).map((skill) => String(skill).toLowerCase())))
  );
  const countrySet = new Set(jobs.map((job) => String(job.country ?? "").toLowerCase()).filter(Boolean));

  const scored = candidates
    .map((candidate) => {
      const settings = candidate.settings ?? {};
      const candidateSkills = normalizeList(settings.skills);
      const overlap = candidateSkills.filter((skill) => aggregatedSkills.includes(skill));
      const sameCountry = countrySet.has(String(candidate.country ?? "").toLowerCase());

      let score = 20 + Math.min(50, overlap.length * 10);
      if (sameCountry) score += 15;
      if (candidate.professional_title) score += 5;
      if (settings.availability) score += 5;

      return {
        candidateId: candidate.id,
        fullName: candidate.full_name,
        headline: candidate.professional_title,
        location: [candidate.city, candidate.country].filter(Boolean).join(", "),
        matchedSkills: overlap,
        matchScore: Math.max(0, Math.min(100, Number(score.toFixed(2)))),
        updatedAt: candidate.updated_at,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const recentlyActive = [...scored].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    topCandidates: scored.slice(0, 10),
    recommendedCandidates: scored.slice(0, 25),
    recentlyActiveCandidates: recentlyActive.slice(0, 10),
    highestMatchScore: scored[0]?.matchScore ?? 0,
  };
}
