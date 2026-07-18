export type DiscoveryKind = "featured" | "recommended";

export type DiscoveryJobRow = {
  id: string;
  title: string;
  status: string | null;
  department: string | null;
  employment_type: string | null;
  country: string | null;
  city: string | null;
  required_skills: string[] | null;
  responsibilities: string | null;
  requirements: string | null;
  publish_date: string | null;
  employers:
    | {
        id: string;
        company_name: string | null;
        verification_status: string | null;
      }
    | {
        id: string;
        company_name: string | null;
        verification_status: string | null;
      }[]
    | null;
};

export type DiscoveryJob = {
  id: string;
  title: string;
  country: string | null;
  city: string | null;
  category: string | null;
  specialization: string | null;
  employment_type: string | null;
  publish_date: string | null;
  summary: string;
  company_display_name: string | null;
};

type CandidatePreferences = {
  country: string | null;
  city: string | null;
  desiredDepartment: string | null;
  skills: string[];
};

function normalizeTokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function sanitizeSummary(value: string | null | undefined, maxLength = 180) {
  if (!value || !value.trim()) return "";
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function isPublishedAndVerified(job: DiscoveryJobRow) {
  const employer = Array.isArray(job.employers) ? job.employers[0] : job.employers;
  return job.status === "published" && employer?.verification_status === "verified";
}

export function mapDiscoveryJob(job: DiscoveryJobRow): DiscoveryJob {
  const employer = Array.isArray(job.employers) ? job.employers[0] : job.employers;
  return {
    id: String(job.id),
    title: String(job.title ?? ""),
    country: job.country ?? null,
    city: job.city ?? null,
    category: job.department ?? null,
    specialization: null,
    employment_type: job.employment_type ?? null,
    publish_date: job.publish_date ?? null,
    summary: sanitizeSummary(job.responsibilities || job.requirements),
    company_display_name: employer?.company_name ?? null,
  };
}

export function pickFeaturedJobs(rows: DiscoveryJobRow[], limit: number) {
  return rows
    .filter(isPublishedAndVerified)
    .sort((left, right) => {
      const leftDate = left.publish_date ? Date.parse(left.publish_date) : 0;
      const rightDate = right.publish_date ? Date.parse(right.publish_date) : 0;
      if (rightDate !== leftDate) return rightDate - leftDate;
      return String(left.id).localeCompare(String(right.id));
    })
    .slice(0, limit)
    .map(mapDiscoveryJob);
}

function computeFallbackScore(job: DiscoveryJobRow, preferences: CandidatePreferences) {
  let score = 0;

  if (preferences.country && job.country && preferences.country.toLowerCase() === job.country.toLowerCase()) {
    score += 5;
  }

  if (preferences.city && job.city && preferences.city.toLowerCase() === job.city.toLowerCase()) {
    score += 4;
  }

  if (preferences.desiredDepartment && job.department) {
    const preferredTokens = new Set(normalizeTokens(preferences.desiredDepartment));
    const jobTokens = normalizeTokens(job.department);
    const overlaps = jobTokens.filter((token) => preferredTokens.has(token)).length;
    score += Math.min(4, overlaps * 2);
  }

  if (preferences.skills.length > 0) {
    const preferredSkills = new Set(preferences.skills.flatMap((skill) => normalizeTokens(skill)));
    const jobSkills = Array.isArray(job.required_skills) ? job.required_skills : [];
    const overlaps = jobSkills
      .flatMap((skill) => normalizeTokens(skill))
      .filter((token) => preferredSkills.has(token)).length;
    score += Math.min(6, overlaps);
  }

  const publishTs = job.publish_date ? Date.parse(job.publish_date) : 0;
  return score * 1_000_000_000 + publishTs;
}

export function pickFallbackRecommendedJobs(rows: DiscoveryJobRow[], preferences: CandidatePreferences, limit: number) {
  return rows
    .filter(isPublishedAndVerified)
    .map((row) => ({ row, score: computeFallbackScore(row, preferences) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return String(left.row.id).localeCompare(String(right.row.id));
    })
    .slice(0, limit)
    .map((item) => mapDiscoveryJob(item.row));
}
