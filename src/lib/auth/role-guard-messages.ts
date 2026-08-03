export const EMPLOYER_BLOCKED_FROM_CANDIDATE_ACTIONS_MESSAGE = {
  en: "You are signed in as an employer. Candidate applications require a candidate account.",
  ar: "أنت مسجل الدخول بحساب شركة. التقديم على الوظائف يتطلب حساب مترشح.",
} as const;

export function getEmployerBlockedFromCandidateActionsMessage(locale: string) {
  return locale === "ar"
    ? EMPLOYER_BLOCKED_FROM_CANDIDATE_ACTIONS_MESSAGE.ar
    : EMPLOYER_BLOCKED_FROM_CANDIDATE_ACTIONS_MESSAGE.en;
}