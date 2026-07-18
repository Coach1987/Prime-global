import { DEFAULT_LOCALE } from "../../constants/locales.ts";
import { sanitizeLocalizedJobReturnTo } from "../../auth/return-to.ts";
import type { CandidateProfileCompletionResult } from "../candidates/profile-completion.ts";

export type ApplicationEligibilityCode =
  | "ROLE_NOT_ELIGIBLE"
  | "JOB_NOT_AVAILABLE"
  | "JOB_NOT_ACTIVE"
  | "CANDIDATE_NOT_FOUND"
  | "DUPLICATE_APPLICATION"
  | "CANDIDATE_PROFILE_INCOMPLETE"
  | "ELIGIBLE";

export type ApplicationEligibilityDecision = {
  code: ApplicationEligibilityCode;
  eligible: boolean;
  onboardingRedirect: string | null;
  duplicateApplicationId: string | null;
  profileCompletionPercent: number;
  missingRequirements: string[];
  cvReady: boolean;
  documentsReady: boolean;
};

export type ApplicationEligibilityInput = {
  role: string;
  candidateFound: boolean;
  jobFound: boolean;
  jobStatus: string | null;
  jobApplicationDeadline: string | null;
  profileCompletion: CandidateProfileCompletionResult | null;
  duplicateApplicationId: string | null;
  locale: string;
  returnTo: string | null;
};

function hasPastDeadline(isoDate: string | null) {
  if (!isoDate) return false;
  const ts = Date.parse(isoDate);
  if (Number.isNaN(ts)) return false;
  return ts < Date.now();
}

export function buildCandidateOnboardingHref(locale: string, returnTo: string | null) {
  const normalizedLocale = locale || DEFAULT_LOCALE;
  const safeReturnTo = sanitizeLocalizedJobReturnTo(returnTo, normalizedLocale);
  if (!safeReturnTo) {
    return `/${normalizedLocale}/candidate/onboarding`;
  }

  const params = new URLSearchParams();
  params.set("returnTo", safeReturnTo);
  return `/${normalizedLocale}/candidate/onboarding?${params.toString()}`;
}

function isRequirementCompleted(profileCompletion: CandidateProfileCompletionResult | null, key: string) {
  if (!profileCompletion) return false;
  return profileCompletion.requirements.some((item) => item.key === key && item.completed);
}

export function evaluateApplicationEligibility(input: ApplicationEligibilityInput): ApplicationEligibilityDecision {
  const missingRequirements = input.profileCompletion?.missing ?? [];
  const completionPercent = input.profileCompletion?.completionPercent ?? 0;
  const cvReady = isRequirementCompleted(input.profileCompletion, "cv");
  const documentsReady = isRequirementCompleted(input.profileCompletion, "diploma");

  if (input.role !== "candidate") {
    return {
      code: "ROLE_NOT_ELIGIBLE",
      eligible: false,
      onboardingRedirect: null,
      duplicateApplicationId: null,
      profileCompletionPercent: completionPercent,
      missingRequirements,
      cvReady,
      documentsReady,
    };
  }

  if (!input.jobFound || input.jobStatus !== "published") {
    return {
      code: "JOB_NOT_AVAILABLE",
      eligible: false,
      onboardingRedirect: null,
      duplicateApplicationId: null,
      profileCompletionPercent: completionPercent,
      missingRequirements,
      cvReady,
      documentsReady,
    };
  }

  if (hasPastDeadline(input.jobApplicationDeadline)) {
    return {
      code: "JOB_NOT_ACTIVE",
      eligible: false,
      onboardingRedirect: null,
      duplicateApplicationId: null,
      profileCompletionPercent: completionPercent,
      missingRequirements,
      cvReady,
      documentsReady,
    };
  }

  if (!input.candidateFound) {
    return {
      code: "CANDIDATE_NOT_FOUND",
      eligible: false,
      onboardingRedirect: null,
      duplicateApplicationId: null,
      profileCompletionPercent: completionPercent,
      missingRequirements,
      cvReady,
      documentsReady,
    };
  }

  if (input.duplicateApplicationId) {
    return {
      code: "DUPLICATE_APPLICATION",
      eligible: false,
      onboardingRedirect: null,
      duplicateApplicationId: input.duplicateApplicationId,
      profileCompletionPercent: completionPercent,
      missingRequirements,
      cvReady,
      documentsReady,
    };
  }

  if (!input.profileCompletion?.completed) {
    return {
      code: "CANDIDATE_PROFILE_INCOMPLETE",
      eligible: false,
      onboardingRedirect: buildCandidateOnboardingHref(input.locale || DEFAULT_LOCALE, input.returnTo),
      duplicateApplicationId: null,
      profileCompletionPercent: completionPercent,
      missingRequirements,
      cvReady,
      documentsReady,
    };
  }

  return {
    code: "ELIGIBLE",
    eligible: true,
    onboardingRedirect: null,
    duplicateApplicationId: null,
    profileCompletionPercent: completionPercent,
    missingRequirements,
    cvReady,
    documentsReady,
  };
}
