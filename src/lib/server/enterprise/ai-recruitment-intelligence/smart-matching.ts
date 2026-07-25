import type { CandidateCanonicalProfileRecord } from "./types.ts";

export interface SmartJobMatchingJobProfileInput {
  jobId: string;
  title: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minimumYearsExperience?: number;
  requiredEducationLevels: string[];
  requiredCertifications: string[];
  requiredLanguages: string[];
  country?: string;
  region?: string;
  workAuthorizationRequired?: boolean;
  employmentType?: string;
  industry?: string;
  specialization?: string;
  availability?: string;
  careerLevel?: string;
  jobFunction?: string;
}

export interface SmartJobMatchingCandidateContextInput {
  yearsExperience?: number;
  educationLevels?: string[];
  certifications?: string[];
  languages?: string[];
  country?: string;
  region?: string;
  workAuthorization?: boolean;
  employmentType?: string;
  industry?: string;
  specialization?: string;
  availability?: string;
  careerLevel?: string;
  jobFunction?: string;
}

export interface SmartJobMatchingScorecard {
  overallMatchScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  certificationScore: number;
  languageScore: number;
  locationScore: number;
  availabilityScore: number;
  confidenceScore: number;
  explanations: Record<string, string>;
}

export interface SmartJobMatchingResult {
  matchCategory: "excellent_match" | "strong_match" | "good_match" | "possible_match" | "weak_match" | "no_match";
  scorecard: SmartJobMatchingScorecard;
  whyCandidateMatches: string[];
  missingSkills: string[];
  missingExperience: string[];
  strengths: string[];
  weaknesses: string[];
  recommendedImprovements: string[];
  evidence: Array<Record<string, unknown>>;
  sourceFields: string[];
}

const WEIGHTS = {
  skills: 0.28,
  experience: 0.2,
  education: 0.1,
  certifications: 0.08,
  languages: 0.08,
  location: 0.12,
  availability: 0.14,
};

function toNorm(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeList(values: unknown) {
  if (!Array.isArray(values)) return [] as string[];
  return values.map((value) => toNorm(String(value))).filter(Boolean);
}

function overlapRatio(left: string[], right: string[]) {
  const l = new Set(left);
  const r = new Set(right);
  if (l.size === 0 || r.size === 0) return 0;
  let hits = 0;
  for (const value of l) {
    if (r.has(value)) hits += 1;
  }
  return hits / Math.max(l.size, r.size);
}

function buildCandidateContext(payload: CandidateCanonicalProfileRecord, input: SmartJobMatchingCandidateContextInput) {
  const canonical = payload.canonical_payload ?? {};

  const canonicalSkills = normalizeList((canonical.skills as Array<Record<string, unknown>> | undefined)?.map((item) => item.skill ?? item.normalizedSkillName));
  const canonicalLanguages = normalizeList((canonical.languages as Array<Record<string, unknown>> | undefined)?.map((item) => item.languageName));
  const canonicalCertifications = normalizeList((canonical.certifications as Array<Record<string, unknown>> | undefined)?.map((item) => item.certificationName));

  const canonicalYearsExperience = Array.isArray(canonical.experiences)
    ? (canonical.experiences as Array<Record<string, unknown>>).reduce((total, item) => {
        const start = typeof item.startDate === "string" ? new Date(item.startDate) : null;
        const end = typeof item.endDate === "string" ? new Date(item.endDate) : new Date();
        if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return total;
        const years = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        return total + years;
      }, 0)
    : 0;

  const canonicalEducationLevels = normalizeList((canonical.educations as Array<Record<string, unknown>> | undefined)?.map((item) => item.degreeTitle));

  return {
    skills: canonicalSkills,
    yearsExperience: input.yearsExperience ?? Number(canonicalYearsExperience.toFixed(2)),
    educationLevels: normalizeList(input.educationLevels?.length ? input.educationLevels : canonicalEducationLevels),
    certifications: normalizeList(input.certifications?.length ? input.certifications : canonicalCertifications),
    languages: normalizeList(input.languages?.length ? input.languages : canonicalLanguages),
    country: toNorm(input.country ?? (canonical as Record<string, unknown>).country as string | undefined),
    region: toNorm(input.region ?? (canonical as Record<string, unknown>).region as string | undefined),
    workAuthorization: input.workAuthorization ?? Boolean((canonical as Record<string, unknown>).workAuthorization ?? false),
    employmentType: toNorm(input.employmentType ?? (canonical as Record<string, unknown>).employmentType as string | undefined),
    industry: toNorm(input.industry ?? (canonical as Record<string, unknown>).industry as string | undefined),
    specialization: toNorm(input.specialization ?? (canonical as Record<string, unknown>).specialization as string | undefined),
    availability: toNorm(input.availability ?? (canonical as Record<string, unknown>).availability as string | undefined),
    careerLevel: toNorm(input.careerLevel ?? (canonical as Record<string, unknown>).careerLevel as string | undefined),
    jobFunction: toNorm(input.jobFunction ?? (canonical as Record<string, unknown>).jobFunction as string | undefined),
  };
}

function roundScore(value: number) {
  return Number(Math.max(0, Math.min(100, value)).toFixed(2));
}

function toMatchCategory(score: number): SmartJobMatchingResult["matchCategory"] {
  if (score >= 90) return "excellent_match";
  if (score >= 75) return "strong_match";
  if (score >= 60) return "good_match";
  if (score >= 45) return "possible_match";
  if (score >= 25) return "weak_match";
  return "no_match";
}

export function buildSmartJobMatch(input: {
  canonicalProfile: CandidateCanonicalProfileRecord;
  candidateContext: SmartJobMatchingCandidateContextInput;
  jobProfile: SmartJobMatchingJobProfileInput;
}): SmartJobMatchingResult {
  const candidate = buildCandidateContext(input.canonicalProfile, input.candidateContext);
  const job = {
    ...input.jobProfile,
    requiredSkills: normalizeList(input.jobProfile.requiredSkills),
    preferredSkills: normalizeList(input.jobProfile.preferredSkills),
    requiredEducationLevels: normalizeList(input.jobProfile.requiredEducationLevels),
    requiredCertifications: normalizeList(input.jobProfile.requiredCertifications),
    requiredLanguages: normalizeList(input.jobProfile.requiredLanguages),
    country: toNorm(input.jobProfile.country),
    region: toNorm(input.jobProfile.region),
    employmentType: toNorm(input.jobProfile.employmentType),
    industry: toNorm(input.jobProfile.industry),
    specialization: toNorm(input.jobProfile.specialization),
    availability: toNorm(input.jobProfile.availability),
    careerLevel: toNorm(input.jobProfile.careerLevel),
    jobFunction: toNorm(input.jobProfile.jobFunction),
  };

  const requiredSkillHit = overlapRatio(job.requiredSkills, candidate.skills);
  const preferredSkillHit = overlapRatio(job.preferredSkills, candidate.skills);
  const skillsScore = roundScore(requiredSkillHit * 80 + preferredSkillHit * 20);

  const yearsTarget = Math.max(0, input.jobProfile.minimumYearsExperience ?? 0);
  const yearsRatio = yearsTarget <= 0 ? 1 : Math.min(1, (candidate.yearsExperience ?? 0) / yearsTarget);
  const industryMatch = job.industry && candidate.industry ? (job.industry === candidate.industry ? 1 : 0) : 0.6;
  const specializationMatch = job.specialization && candidate.specialization ? (job.specialization === candidate.specialization ? 1 : 0) : 0.6;
  const careerLevelMatch = job.careerLevel && candidate.careerLevel ? (job.careerLevel === candidate.careerLevel ? 1 : 0) : 0.6;
  const jobFunctionMatch = job.jobFunction && candidate.jobFunction ? (job.jobFunction === candidate.jobFunction ? 1 : 0) : 0.6;
  const experienceScore = roundScore((yearsRatio * 0.5 + industryMatch * 0.15 + specializationMatch * 0.15 + careerLevelMatch * 0.1 + jobFunctionMatch * 0.1) * 100);

  const educationScore = roundScore(overlapRatio(job.requiredEducationLevels, candidate.educationLevels) * 100);
  const certificationScore = roundScore(overlapRatio(job.requiredCertifications, candidate.certifications) * 100);
  const languageScore = roundScore(overlapRatio(job.requiredLanguages, candidate.languages) * 100);

  const countryScore = !job.country ? 1 : job.country === candidate.country ? 1 : 0;
  const regionScore = !job.region ? 1 : job.region === candidate.region ? 1 : 0.3;
  const locationScore = roundScore((countryScore * 0.7 + regionScore * 0.3) * 100);

  const workAuthScore = input.jobProfile.workAuthorizationRequired ? (candidate.workAuthorization ? 1 : 0) : 1;
  const employmentTypeScore = job.employmentType ? (job.employmentType === candidate.employmentType ? 1 : 0.35) : 1;
  const availabilityScorePart = job.availability ? (job.availability === candidate.availability ? 1 : 0.4) : 0.7;
  const availabilityScore = roundScore((workAuthScore * 0.45 + employmentTypeScore * 0.25 + availabilityScorePart * 0.3) * 100);

  const overallMatchScore = roundScore(
    skillsScore * WEIGHTS.skills
      + experienceScore * WEIGHTS.experience
      + educationScore * WEIGHTS.education
      + certificationScore * WEIGHTS.certifications
      + languageScore * WEIGHTS.languages
      + locationScore * WEIGHTS.location
      + availabilityScore * WEIGHTS.availability
  );

  const sourceFields = [
    "skills",
    "experiences",
    "educations",
    "certifications",
    "languages",
    "country",
    "region",
    "workAuthorization",
    "employmentType",
    "availability",
    "industry",
    "specialization",
    "careerLevel",
    "jobFunction",
  ];

  const completeness = sourceFields.filter((field) => {
    const value = candidate[field as keyof typeof candidate];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return value > 0;
    if (typeof value === "boolean") return true;
    return String(value ?? "").trim().length > 0;
  }).length / sourceFields.length;

  const confidenceScore = roundScore((completeness * 0.55 + (overallMatchScore / 100) * 0.45) * 100);

  const missingSkills = job.requiredSkills.filter((skill) => !candidate.skills.includes(skill));
  const missingExperience: string[] = [];
  if (yearsRatio < 1 && yearsTarget > 0) missingExperience.push(`years_experience_below_required:${yearsTarget}`);
  if (industryMatch < 1 && job.industry) missingExperience.push(`industry_mismatch:${job.industry}`);
  if (specializationMatch < 1 && job.specialization) missingExperience.push(`specialization_mismatch:${job.specialization}`);

  const strengths: string[] = [];
  if (skillsScore >= 70) strengths.push("strong_required_skill_alignment");
  if (experienceScore >= 70) strengths.push("relevant_experience_alignment");
  if (educationScore >= 60) strengths.push("education_alignment");
  if (languageScore >= 60) strengths.push("language_alignment");
  if (locationScore >= 70) strengths.push("location_alignment");

  const weaknesses: string[] = [];
  if (skillsScore < 50) weaknesses.push("required_skill_gaps_detected");
  if (experienceScore < 50) weaknesses.push("experience_gap_detected");
  if (availabilityScore < 50) weaknesses.push("availability_or_authorization_gap");
  if (locationScore < 50) weaknesses.push("location_gap_detected");

  const recommendedImprovements: string[] = [];
  if (missingSkills.length > 0) recommendedImprovements.push("target_required_skills_upskilling");
  if (missingExperience.length > 0) recommendedImprovements.push("add_relevant_experience_signals");
  if (educationScore < 60) recommendedImprovements.push("add_or_verify_education_credentials");
  if (certificationScore < 60 && job.requiredCertifications.length > 0) recommendedImprovements.push("pursue_required_certifications");

  const explanations = {
    overallMatchScore: `Weighted score using dimensions: skills ${WEIGHTS.skills}, experience ${WEIGHTS.experience}, education ${WEIGHTS.education}, certifications ${WEIGHTS.certifications}, languages ${WEIGHTS.languages}, location ${WEIGHTS.location}, availability ${WEIGHTS.availability}.`,
    skillsScore: `Required skills overlap ${(requiredSkillHit * 100).toFixed(2)}% and preferred skills overlap ${(preferredSkillHit * 100).toFixed(2)}%.`,
    experienceScore: `Years ratio ${(yearsRatio * 100).toFixed(2)}%, industry ${(industryMatch * 100).toFixed(0)}%, specialization ${(specializationMatch * 100).toFixed(0)}%, career level ${(careerLevelMatch * 100).toFixed(0)}%, function ${(jobFunctionMatch * 100).toFixed(0)}%.`,
    educationScore: `Education overlap with required levels ${(educationScore).toFixed(2)}%.`,
    certificationScore: `Certification overlap with required certifications ${(certificationScore).toFixed(2)}%.`,
    languageScore: `Language overlap with required languages ${(languageScore).toFixed(2)}%.`,
    locationScore: `Country score ${(countryScore * 100).toFixed(0)}% and region score ${(regionScore * 100).toFixed(0)}%.`,
    availabilityScore: `Work authorization ${(workAuthScore * 100).toFixed(0)}%, employment type ${(employmentTypeScore * 100).toFixed(0)}%, availability ${(availabilityScorePart * 100).toFixed(0)}%.`,
    confidenceScore: `Confidence combines source completeness ${(completeness * 100).toFixed(2)}% and signal strength ${(overallMatchScore).toFixed(2)}%.`,
  };

  return {
    matchCategory: toMatchCategory(overallMatchScore),
    scorecard: {
      overallMatchScore,
      skillsScore,
      experienceScore,
      educationScore,
      certificationScore,
      languageScore,
      locationScore,
      availabilityScore,
      confidenceScore,
      explanations,
    },
    whyCandidateMatches: [
      ...strengths,
      ...(overallMatchScore >= 60 ? ["multi_dimension_match_threshold_met"] : []),
    ],
    missingSkills,
    missingExperience,
    strengths,
    weaknesses,
    recommendedImprovements,
    evidence: [
      {
        canonicalProfileId: input.canonicalProfile.id,
        sourceDocumentAnalysisIds: input.canonicalProfile.source_document_analysis_ids,
      },
      {
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
      },
    ],
    sourceFields,
  };
}
