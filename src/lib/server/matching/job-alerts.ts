import { serverEnv } from "@/lib/server/config/env";

export interface CandidateAlertProfile {
  candidateId: string;
  authUserId: string;
  email: string;
  locale: "en" | "ar";
  desiredJobTitles: string[];
  relatedJobTitles: string[];
  skills: string[];
  experienceLevel?: string | null;
  industry?: string | null;
  country?: string | null;
  city?: string | null;
  workModePreference?: "remote" | "hybrid" | "onsite" | "any";
  languages: string[];
  availability?: string | null;
  notificationThreshold?: number;
}

export interface PublishedJobProfile {
  id: string;
  title: string;
  companyDisplayName: string;
  shortSummary: string;
  requiredSkills: string[];
  experience: string;
  country: string;
  city: string;
  workMode: "remote" | "hybrid" | "onsite";
  languages: string[];
}

export interface JobAlertScore {
  matchScore: number;
  reasons: string[];
}

const TITLE_SYNONYMS: Record<string, string[]> = {
  "fitness trainer": ["personal trainer", "fitness coach", "gym instructor", "strength coach"],
  "personal trainer": ["fitness trainer", "fitness coach", "gym instructor", "strength coach"],
  "fitness coach": ["fitness trainer", "personal trainer", "gym instructor", "strength coach"],
  "gym instructor": ["fitness trainer", "personal trainer", "fitness coach", "strength coach"],
  "strength coach": ["fitness trainer", "personal trainer", "fitness coach", "gym instructor"],
};

function norm(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function toSet(values: string[]) {
  return new Set(values.map((value) => norm(value)).filter(Boolean));
}

function expandTitles(titles: string[]) {
  const normalized = titles.map((title) => norm(title)).filter(Boolean);
  const expanded = new Set<string>(normalized);

  for (const title of normalized) {
    for (const synonym of TITLE_SYNONYMS[title] ?? []) {
      expanded.add(norm(synonym));
    }
  }

  return Array.from(expanded);
}

function overlapRatio(a: string[], b: string[]) {
  const left = toSet(a);
  const right = toSet(b);
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const item of left) {
    if (right.has(item)) shared += 1;
  }

  return shared / Math.max(left.size, right.size);
}

export function getJobAlertThreshold() {
  const configured = Number(serverEnv.JOB_ALERT_MATCH_THRESHOLD ?? "70");
  if (!Number.isFinite(configured)) return 70;
  return Math.max(0, Math.min(100, Math.floor(configured)));
}

export function scoreJobForCandidateAlerts(candidate: CandidateAlertProfile, job: PublishedJobProfile): JobAlertScore {
  const expandedTitles = expandTitles([...candidate.desiredJobTitles, ...candidate.relatedJobTitles]);
  const titleNorm = norm(job.title);

  let titleScore = 0;
  if (expandedTitles.some((title) => titleNorm.includes(title) || title.includes(titleNorm))) {
    titleScore = 100;
  } else {
    const partial = expandedTitles
      .map((title) => {
        const words = title.split(/\s+/).filter(Boolean);
        const shared = words.filter((word) => titleNorm.includes(word)).length;
        return words.length > 0 ? shared / words.length : 0;
      })
      .sort((left, right) => right - left)[0] ?? 0;
    titleScore = partial * 100;
  }

  const skillsScore = overlapRatio(candidate.skills, job.requiredSkills) * 100;

  const expScore = candidate.experienceLevel
    ? norm(job.experience).includes(norm(candidate.experienceLevel))
      ? 100
      : 40
    : 60;

  const locationScore =
    candidate.country && candidate.city
      ? norm(candidate.country) === norm(job.country) && norm(candidate.city) === norm(job.city)
        ? 100
        : norm(candidate.country) === norm(job.country)
          ? 75
          : 20
      : candidate.country
        ? norm(candidate.country) === norm(job.country)
          ? 85
          : 20
        : 60;

  const languageScore = candidate.languages.length > 0 ? overlapRatio(candidate.languages, job.languages) * 100 : 65;

  const workModeScore =
    candidate.workModePreference && candidate.workModePreference !== "any"
      ? candidate.workModePreference === job.workMode
        ? 100
        : 20
      : 70;

  const availabilityScore = candidate.availability ? 75 : 60;

  const weighted =
    titleScore * 0.25 +
    skillsScore * 0.22 +
    expScore * 0.12 +
    locationScore * 0.14 +
    languageScore * 0.1 +
    workModeScore * 0.1 +
    availabilityScore * 0.07;

  const reasons: string[] = [];
  if (titleScore >= 60) reasons.push("Job title similarity");
  if (skillsScore >= 45) reasons.push("Skills overlap");
  if (expScore >= 70) reasons.push("Experience compatibility");
  if (locationScore >= 70) reasons.push("Location compatibility");
  if (languageScore >= 50) reasons.push("Language compatibility");
  if (workModeScore >= 70) reasons.push("Work-mode preference match");
  if (availabilityScore >= 70) reasons.push("Availability alignment");

  return {
    matchScore: Math.max(0, Math.min(100, Number(weighted.toFixed(2)))),
    reasons,
  };
}
