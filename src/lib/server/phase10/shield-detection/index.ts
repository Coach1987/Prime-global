import type { ShieldCandidateFriendlyPlan, ShieldDetectionObservation } from "./types.ts";

const FRIENDLY_REMINDER =
  "To help protect candidates and employers, contact details can only be exchanged after the recruitment process reaches the appropriate stage.";

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function classifyShieldDetectionExperience(observation: ShieldDetectionObservation): ShieldCandidateFriendlyPlan {
  const confidenceScore = clampConfidence(observation.confidenceScore);

  if (observation.confidenceBand === "low" || confidenceScore < 0.35) {
    return {
      level: 0,
      summary: "Normal flow. No interruption.",
      internalLogOnly: false,
      showUserMessage: false,
      userMessage: null,
      allowEditAndContinue: true,
      notifyPolicyEngine: false,
      notifyRuleEngine: false,
      appendEvidenceReference: false,
      governanceReviewRecommended: false,
      automaticPenalty: "none",
    };
  }

  if (observation.confidenceBand === "medium" || confidenceScore < 0.7) {
    return {
      level: 1,
      summary: "Soft detection observed internally.",
      internalLogOnly: true,
      showUserMessage: false,
      userMessage: null,
      allowEditAndContinue: true,
      notifyPolicyEngine: false,
      notifyRuleEngine: false,
      appendEvidenceReference: false,
      governanceReviewRecommended: false,
      automaticPenalty: "none",
    };
  }

  if (observation.confidenceBand === "high" || observation.repeatedConfirmedAttempts < 3 || confidenceScore < 0.9) {
    return {
      level: 2,
      summary: "High confidence signal with friendly reminder.",
      internalLogOnly: false,
      showUserMessage: true,
      userMessage: FRIENDLY_REMINDER,
      allowEditAndContinue: true,
      notifyPolicyEngine: false,
      notifyRuleEngine: false,
      appendEvidenceReference: false,
      governanceReviewRecommended: false,
      automaticPenalty: "none",
    };
  }

  return {
    level: 3,
    summary: "Repeated high-confidence behavior sent for policy and rule evaluation.",
    internalLogOnly: false,
    showUserMessage: true,
    userMessage: FRIENDLY_REMINDER,
    allowEditAndContinue: true,
    notifyPolicyEngine: true,
    notifyRuleEngine: true,
    appendEvidenceReference: true,
    governanceReviewRecommended: true,
    automaticPenalty: "none",
  };
}

export { FRIENDLY_REMINDER as PHASE10_SHIELD_FRIENDLY_REMINDER };

export type {
  ShieldCandidateFriendlyPlan,
  ShieldConfidenceBand,
  ShieldDetectionLevel,
  ShieldDetectionObservation,
  ShieldDetectionSignalType,
} from "./types.ts";
