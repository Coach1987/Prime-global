interface CandidateProfileLike {
  id: string;
  full_name?: string | null;
  professional_title?: string | null;
  country?: string | null;
  city?: string | null;
  settings?: Record<string, unknown> | null;
}

interface JobProfileLike {
  id: string;
  title: string;
  country: string;
  city?: string | null;
  department?: string | null;
  required_skills: string[];
  experience?: string | null;
  education?: string | null;
}

interface EmployerProfileLike {
  id: string;
  company_name?: string | null;
  country?: string | null;
  industry?: string | null;
  verification_status?: string | null;
  trust_score?: number | null;
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function scoreOverlap(primary: string[], secondary: string[]) {
  return primary.filter((item) => secondary.includes(item));
}

export function buildCandidateMatchInsight(candidate: CandidateProfileLike, job: JobProfileLike) {
  const settings = candidate.settings ?? {};
  const candidateSkills = normalizeList(settings.skills);
  const candidateLanguages = normalizeList(settings.languages);
  const candidateCertifications = normalizeList(settings.certifications);
  const preferredCountry = normalizeText(candidate.country ?? settings.country);
  const candidateEducation = normalizeText(settings.education);
  const candidateExperience = normalizeText(settings.experience);
  const jobSkills = normalizeList(job.required_skills);

  let compatibility = 18;
  let confidence = 54;
  const strengths: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  const skillOverlap = scoreOverlap(jobSkills, candidateSkills);
  if (skillOverlap.length > 0) {
    compatibility += Math.min(42, skillOverlap.length * 9);
    confidence += 10;
    strengths.push(`Shared skills: ${skillOverlap.slice(0, 4).join(", ")}`);
  } else {
    risks.push("No direct skill overlap detected");
    recommendations.push("Review adjacent skills and training potential");
  }

  if (preferredCountry && preferredCountry === normalizeText(job.country)) {
    compatibility += 12;
    confidence += 8;
    strengths.push("Country preference aligned");
  } else if (preferredCountry) {
    risks.push("Country preference differs from job location");
  }

  if (candidateEducation && normalizeText(job.education).includes(candidateEducation)) {
    compatibility += 8;
    confidence += 4;
    strengths.push("Education alignment detected");
  } else if (candidateEducation) {
    recommendations.push("Consider education-based shortlist review");
  }

  if (candidateExperience && normalizeText(job.experience).includes(candidateExperience)) {
    compatibility += 8;
    confidence += 4;
    strengths.push("Experience level aligned");
  } else if (candidateExperience) {
    risks.push("Experience depth may need validation");
  }

  if (candidateLanguages.length > 0) {
    confidence += 5;
    strengths.push(`Language coverage: ${candidateLanguages.slice(0, 2).join(", ")}`);
  }

  if (candidateCertifications.length > 0) {
    compatibility += Math.min(10, candidateCertifications.length * 2);
    recommendations.push("Certifications can be highlighted to the hiring team");
  }

  compatibility = Math.max(0, Math.min(100, Number(compatibility.toFixed(2))));
  confidence = Math.max(0, Math.min(100, Number(confidence.toFixed(2))));

  return {
    compatibilityScore: compatibility,
    confidenceScore: confidence,
    strengths,
    risks,
    recommendations,
    explanation: {
      candidateId: candidate.id,
      jobId: job.id,
      title: job.title,
      location: [job.city, job.country].filter(Boolean).join(", "),
    },
  };
}

export function buildEmployerMatchInsight(employer: EmployerProfileLike, candidate: CandidateProfileLike) {
  const settings = candidate.settings ?? {};
  const candidateSkills = normalizeList(settings.skills);
  const candidateLanguages = normalizeList(settings.languages);
  const employerCountry = normalizeText(employer.country);
  const candidateCountry = normalizeText(candidate.country ?? settings.country);

  let compatibility = 24;
  let confidence = 48;
  const strengths: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];

  if (employer.verification_status === "verified") {
    compatibility += 12;
    confidence += 14;
    strengths.push("Verified employer profile");
  } else {
    risks.push("Employer profile still awaiting verification");
    recommendations.push("Complete enterprise verification before outreach");
  }

  if (employer.trust_score && employer.trust_score >= 70) {
    compatibility += 10;
    confidence += 8;
    strengths.push(`Trust score ${employer.trust_score.toFixed(1)}`);
  }

  if (employerCountry && candidateCountry && employerCountry === candidateCountry) {
    compatibility += 10;
    strengths.push("Location compatibility");
  }

  if (candidateSkills.length > 0) {
    compatibility += Math.min(20, candidateSkills.length * 1.5);
    confidence += 6;
    recommendations.push("Align the outreach with the candidate skill profile");
  }

  if (candidateLanguages.length > 0) {
    confidence += 6;
    strengths.push(`Languages: ${candidateLanguages.slice(0, 2).join(", ")}`);
  }

  compatibility = Math.max(0, Math.min(100, Number(compatibility.toFixed(2))));
  confidence = Math.max(0, Math.min(100, Number(confidence.toFixed(2))));

  return {
    compatibilityScore: compatibility,
    confidenceScore: confidence,
    strengths,
    risks,
    recommendations,
    explanation: {
      employerId: employer.id,
      candidateId: candidate.id,
      company: employer.company_name ?? null,
      professionalTitle: candidate.professional_title ?? null,
    },
  };
}
