export type PGPEProtectionSignalType =
  | "email"
  | "phone"
  | "qr"
  | "url"
  | "hidden_metadata"
  | "ocr_text"
  | "document_text"
  | "private_attachment";

export type PGPEConfidenceLevel = "low" | "medium" | "high" | "very_high";

export type PGPEReviewStatus = "confirmed" | "false_positive" | "ignored" | "manually_reviewed";

export type PGPEProtectionAction =
  | "none"
  | "mask"
  | "remove_from_employer_copy"
  | "convert_to_protected_placeholder"
  | "protected_copy";

export type PGPEPipelineStep =
  | "normalize"
  | "inspect"
  | "analyze"
  | "confidence_scoring"
  | "protection_decision"
  | "automatic_protection"
  | "evidence_reference"
  | "continue_workflow";

export interface PGPEProviderResult {
  detector: string;
  confidence: number;
  reason: string;
  evidenceReference: string | null;
  suggestedAction: PGPEProtectionAction;
  protectionAction: PGPEProtectionAction;
  humanReviewRequired: boolean;
  falsePositivePossible: boolean;
}

export interface PGPEProtectionObservation {
  signalType: PGPEProtectionSignalType;
  confidenceLevel: PGPEConfidenceLevel;
  confidenceScore: number;
  repeatedConfirmedAttempts: number;
  providerResult: PGPEProviderResult;
}

export interface PGPEProtectionDecision {
  confidenceLevel: PGPEConfidenceLevel;
  protectionAction: PGPEProtectionAction;
  showFriendlyNotification: boolean;
  userMessage: string | null;
  notifyPolicyEngine: boolean;
  notifyRuleEngine: boolean;
  appendEvidenceReference: boolean;
  continueWorkflow: boolean;
  automaticPenalty: "none";
}

export interface PGPEProtectionResult extends PGPEProviderResult {
  confidenceLevel: PGPEConfidenceLevel;
  continueWorkflow: true;
  userMessage: string | null;
}

export interface PGPEOriginalCopyModel {
  encrypted: true;
  owner: "prime_global";
  visibleToEmployer: false;
}

export interface PGPEProtectedCopyModel {
  usedForRecruitment: true;
  visibleToEmployer: true;
  redactionApplied: true;
}

export interface PGPEFutureAIProfessionalProfileModel {
  generatedLater: true;
  source: "protected_copy";
  aiNotImplemented: true;
}

export interface PGPEDocumentModelArchitecture {
  originalCopy: PGPEOriginalCopyModel;
  protectedCopy: PGPEProtectedCopyModel;
  futureAIProfessionalProfile: PGPEFutureAIProfessionalProfileModel;
}

export type PGPEProtectionEventType =
  | "pgpe.protection.pipeline.started"
  | "pgpe.protection.decision.created"
  | "pgpe.protection.applied"
  | "pgpe.protection.workflow.continued";

export interface PGPEProtectionEvent {
  eventType: PGPEProtectionEventType;
  sourceId: string;
  occurredAt: string;
  detector: string;
  evidenceReference: string | null;
  protectionAction: PGPEProtectionAction;
}

export interface PGPEProtectionAuditRecord {
  auditId: string;
  sourceId: string;
  detector: string;
  confidence: number;
  reason: string;
  evidenceReference: string | null;
  suggestedAction: PGPEProtectionAction;
  protectionAction: PGPEProtectionAction;
  humanReviewRequired: boolean;
  falsePositivePossible: boolean;
  createdAt: string;
}

export interface PGPEProtectionTimelineEvent {
  sourceId: string;
  timelineCode: "privacy_protection_applied";
  userMessage: string;
  createdAt: string;
}
