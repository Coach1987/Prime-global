interface CandidateLike {
  country?: string | null;
  professional_title?: string | null;
  settings?: Record<string, unknown> | null;
}

interface JobLike {
  id: string;
  title: string;
  country: string;
  education: string;
  experience: string;
  required_skills: string[];
  salary_min: number | null;
  salary_max: number | null;
}

export interface MatchResult {
  jobId: string;
  matchScore: number;
  reasons: string[];
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function includesOne(haystack: string, needles: string[]) {
  return needles.some((needle) => needle && haystack.includes(needle));
}

export function scoreCandidateAgainstJobs(candidate: CandidateLike, jobs: JobLike[]): MatchResult[] {
  const settings = candidate.settings ?? {};
  const candidateSkills = normalizeList(settings.skills);
  const candidateLanguages = normalizeList(settings.languages);
  const candidateEducation = normalizeString(settings.education);
  const candidateExperience = normalizeString(settings.experience);
  const candidateCountry = normalizeString(candidate.country ?? settings.country);
  const expectedSalary = Number(settings.salaryExpectation ?? 0);
  const availability = normalizeString(settings.availability);

  return jobs
    .map((job) => {
      let score = 10;
      const reasons: string[] = [];

      const jobSkills = (job.required_skills ?? []).map((value) => String(value).toLowerCase());
      const overlap = jobSkills.filter((skill) => candidateSkills.includes(skill));
      if (overlap.length > 0) {
        score += Math.min(40, overlap.length * 8);
        reasons.push(`Skills overlap: ${overlap.slice(0, 4).join(", ")}`);
      }

      if (candidateCountry && candidateCountry === normalizeString(job.country)) {
        score += 15;
        reasons.push("Country preference matches");
      }

      if (candidateEducation && includesOne(normalizeString(job.education), [candidateEducation])) {
        score += 10;
        reasons.push("Education level aligned");
      }

      if (candidateExperience && includesOne(normalizeString(job.experience), [candidateExperience])) {
        score += 10;
        reasons.push("Experience level aligned");
      }

      if (candidateLanguages.length > 0) {
        score += 5;
        reasons.push(`Language profile available: ${candidateLanguages.slice(0, 2).join(", ")}`);
      }

      if (availability) {
        score += 5;
        reasons.push(`Availability: ${availability}`);
      }

      if (expectedSalary > 0 && job.salary_max && expectedSalary <= job.salary_max) {
        score += 5;
        reasons.push("Salary expectation within range");
      }

      return {
        jobId: job.id,
        matchScore: Math.max(0, Math.min(100, Number(score.toFixed(2)))),
        reasons,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
