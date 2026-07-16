import type { AnalysisActor, ConfidenceLevel, RecruitmentWorkflowStage } from "../types.ts";
import type { ResolvedRuleDecisionReference } from "../rules/types.ts";

export type ContactSourceCategory =
  | "messages"
  | "profile_text"
  | "job_advertisements"
  | "extracted_document_text"
  | "ocr_output"
  | "metadata"
  | "links"
  | "filenames"
  | "future_attachment_findings";

export type ContactCategory =
  | "email"
  | "phone"
  | "whatsapp"
  | "telegram"
  | "signal"
  | "discord"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "snapchat"
  | "tiktok"
  | "skype"
  | "wechat"
  | "viber"
  | "slack"
  | "calendly"
  | "google_meet"
  | "zoom"
  | "microsoft_teams"
  | "google_drive"
  | "dropbox"
  | "onedrive"
  | "shortened_url"
  | "external_url"
  | "external_meeting_link"
  | "social_handle"
  | "qr_extracted_contact"
  | "barcode_extracted_contact"
  | "unknown_bypass_pattern";

export type ContactProtectionAction =
  | "mask"
  | "replace_with_placeholder"
  | "neutralize_link"
  | "remove_tracking_parameters"
  | "hide_social_handle"
  | "mask_phone"
  | "mask_email"
  | "block_external_meeting_link"
  | "protected_copy_only"
  | "internal_review"
  | "observe_only";

export interface SourceRange {
  start: number;
  end: number;
}

export interface CrossMessageReference {
  conversationId: string;
  messageId: string;
  tokenHash: string;
}

export interface ContactDetectorFinding {
  detectorId: string;
  detectorVersion: string;
  ruleId: string;
  findingType: ContactCategory;
  normalizedValueHash: string;
  redactedPreview: string;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  explanation: string;
  matchingReasons: string[];
  sourceRange: SourceRange | null;
  crossMessageReferences: CrossMessageReference[];
  suggestedProtectionAction: ContactProtectionAction;
  humanReviewRequirement: boolean;
  falsePositivePossible: boolean;
}

export interface ContactDetectorInput {
  sourceText: string;
  sourceCategory: ContactSourceCategory;
  conversationId: string;
  workflowStage: RecruitmentWorkflowStage;
}

export interface ContactDetectorProvider {
  detectorId: string;
  detectorVersion: string;
  detect(input: ContactDetectorInput): ContactDetectorFinding[];
}

export interface MessageProtectionContext {
  actor: AnalysisActor;
  organizationId: string;
  tenantId: string | null;
  conversationId: string;
  workflowStage: RecruitmentWorkflowStage;
  priorRelatedFindings: ContactDetectorFinding[];
  policyVersion: string;
  consentVersion: string;
}

export interface MessageProtectionRequest {
  messageId: string;
  messageText: string;
  sourceCategory: ContactSourceCategory;
  context: MessageProtectionContext;
}

export interface ProtectedMessageProjection {
  projectionId: string;
  messageId: string;
  conversationId: string;
  organizationId: string;
  originalMessageReference: string;
  protectedMessageText: string;
  candidateSafeText: string;
  employerSafeText: string;
  createdAt: string;
}

export interface MessageProtectionAuditEntry {
  event: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MessageProtectionResult {
  originalMessageReference: string;
  protectedMessageText: string;
  findings: ContactDetectorFinding[];
  appliedRules: ResolvedRuleDecisionReference[];
  protectionActions: ContactProtectionAction[];
  candidateFriendlyExplanation: string;
  employerSafeText: string;
  evidenceReferences: string[];
  timelineEntry: string;
  auditMetadata: MessageProtectionAuditEntry[];
  reviewRequirement: boolean;
  continuationStatus: "continued" | "continued_with_review";
  policyEvaluated: boolean;
  projection: ProtectedMessageProjection | null;
}

export interface MessageProjectionRepository {
  save(projection: ProtectedMessageProjection): Promise<void>;
  getByMessageId(messageId: string): Promise<ProtectedMessageProjection | null>;
}

export interface CrossMessageTokenRecord {
  conversationId: string;
  organizationId: string;
  messageId: string;
  tokenHash: string;
  createdAt: string;
}

export interface CrossMessageRepository {
  append(record: CrossMessageTokenRecord): Promise<void>;
  listConversationWindow(conversationId: string, windowSize: number): Promise<CrossMessageTokenRecord[]>;
}

export type FalsePositiveOutcome = "confirmed" | "false_positive" | "ignored" | "manually_reviewed" | "policy_exception";

export interface FalsePositiveRecord {
  findingHash: string;
  outcome: FalsePositiveOutcome;
  correctionMetadata: Record<string, unknown>;
  recordedAt: string;
}

export interface FalsePositiveRepository {
  append(record: FalsePositiveRecord): Promise<void>;
  listByFindingHash(findingHash: string): Promise<FalsePositiveRecord[]>;
}

export interface ContactProtectionDependencies {
  detectors: ContactDetectorProvider[];
  projectionRepository: MessageProjectionRepository;
  crossMessageRepository: CrossMessageRepository;
  falsePositiveRepository: FalsePositiveRepository;
  resolveRule: (input: {
    findingType: "email" | "phone" | "url" | "shortened_url" | "social_handle" | "qr_code" | "barcode" | "external_meeting_link" | "unknown_sensitive_pattern";
    fieldCategory: "personal_email" | "personal_phone" | "portfolio" | "private_documents";
    workflowStage: RecruitmentWorkflowStage;
    actorRole: AnalysisActor["role"];
    organizationId: string;
    tenantId: string | null;
    policyVersion: string;
    consentVersion: string;
  }) => ResolvedRuleDecisionReference;
  emitEvent: (eventType: string, metadata: Record<string, unknown>) => Promise<void>;
  appendAudit: (event: string, metadata: Record<string, unknown>) => Promise<void>;
  appendEvidence: (metadataHash: string, metadata: Record<string, unknown>) => Promise<void>;
}

export interface ProfileProtectionPlan {
  sourceCategory: "profile_text" | "job_advertisements";
  protectedText: string;
  findings: ContactDetectorFinding[];
  reviewRequired: boolean;
  continuationStatus: "continued" | "continued_with_review";
}
