export type ShieldDetectionSignalType =
  | "possible_email"
  | "possible_phone"
  | "possible_qr"
  | "possible_external_link"
  | "possible_contact_exchange"
  | "possible_circumvention";

export type ShieldConfidenceBand = "low" | "medium" | "high" | "very_high";

export type ShieldDetectionLevel = 0 | 1 | 2 | 3;

export interface ShieldDetectionObservation {
  signalType: ShieldDetectionSignalType;
  confidenceBand: ShieldConfidenceBand;
  confidenceScore: number;
  repeatedConfirmedAttempts: number;
  detector: string;
  excerptReference?: string | null;
}

export interface ShieldCandidateFriendlyPlan {
  level: ShieldDetectionLevel;
  summary: string;
  internalLogOnly: boolean;
  showUserMessage: boolean;
  userMessage: string | null;
  allowEditAndContinue: boolean;
  notifyPolicyEngine: boolean;
  notifyRuleEngine: boolean;
  appendEvidenceReference: boolean;
  governanceReviewRecommended: boolean;
  automaticPenalty: "none";
}
