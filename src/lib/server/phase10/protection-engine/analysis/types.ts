export type ProtectionFindingType =
  | "email"
  | "phone"
  | "url"
  | "shortened_url"
  | "social_handle"
  | "qr_code"
  | "barcode"
  | "address"
  | "passport_number"
  | "national_id"
  | "personal_number"
  | "hidden_metadata"
  | "embedded_link"
  | "external_meeting_link"
  | "unknown_sensitive_pattern";

export type ConfidenceLevel = "low" | "medium" | "high" | "very_high";

export type ProtectionCategory =
  | "contact_information"
  | "identity_document"
  | "metadata"
  | "linkage"
  | "image_code"
  | "unknown";

export type ProtectionAction =
  | "observe"
  | "text_redact"
  | "image_region_redact"
  | "mask_qr"
  | "mask_barcode"
  | "metadata_strip"
  | "link_neutralize"
  | "replace_placeholder";

export type AnalysisProviderName =
  | "ocr-protection"
  | "qr-protection"
  | "barcode-protection"
  | "pdf-text-extraction"
  | "docx-text-extraction"
  | "image-analysis"
  | "metadata-protection"
  | "archive-inspection"
  | "file-type-detection"
  | "analysis-core";

export type SupportedFileCategory = "pdf" | "doc" | "docx" | "png" | "jpeg" | "webp" | "zip" | "archive" | "unknown";

export type ProtectionPlanStatus =
  | "pending_analysis"
  | "analysis_complete"
  | "protection_planned"
  | "protection_ready"
  | "review_required"
  | "failed_safe"
  | "cancelled";

export type ProtectionLevel =
  | "strict_private"
  | "protected_recruitment"
  | "staff_review"
  | "authorized_partial_reveal"
  | "contract_stage_limited_reveal"
  | "closed_process";

export type RecruitmentWorkflowStage =
  | "intake"
  | "screening"
  | "matching"
  | "interview"
  | "offer"
  | "contract"
  | "closed";

export type DisclosureFieldCategory =
  | "professional_name"
  | "candidate_reference"
  | "professional_title"
  | "general_location"
  | "experience"
  | "skills"
  | "education"
  | "certifications"
  | "languages"
  | "portfolio"
  | "availability"
  | "salary_expectations"
  | "work_authorization"
  | "personal_email"
  | "personal_phone"
  | "precise_address"
  | "passport_number"
  | "national_id"
  | "original_cv"
  | "private_documents";

export type DisclosureState = "hidden" | "masked" | "summarized" | "protected_placeholder" | "revealed" | "staff_only";

export type DecisionOrigin = "policy_engine" | "business_rule_engine" | "workflow_kernel" | "staff_override" | "system_default";

export type DecisionFeedbackStatus = "confirmed" | "false_positive" | "ignored" | "manually_reviewed" | "policy_exception";

export type ProtectionReviewStatus = "not_required" | "required" | "in_review" | "reviewed";

export type QuarantineStatus =
  | "received"
  | "validating"
  | "analyzing"
  | "protection_planning"
  | "ready"
  | "review_required"
  | "failed_safe"
  | "expired";

export type QuarantineFailureReasonCategory =
  | "unsupported_file_type"
  | "unsafe_file"
  | "mime_spoofing_suspected"
  | "provider_timeout"
  | "extraction_failed"
  | "size_limit"
  | "page_limit"
  | "decompression_limit"
  | "unknown";

export interface ConfidenceModel {
  level: ConfidenceLevel;
  score: number;
  explanation: string;
}

export interface FindingCoordinateRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: "pixel" | "ratio";
}

export interface ProtectionFinding {
  findingId: string;
  findingType: ProtectionFindingType;
  sourceProvider: AnalysisProviderName;
  sourceFileReference: string;
  pageNumber: number | null;
  region: FindingCoordinateRegion | null;
  normalizedExcerpt: string;
  redactedExcerpt: string;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  explanation: string;
  protectionCategory: ProtectionCategory;
  suggestedProtectionAction: ProtectionAction;
  evidenceReference: string | null;
  humanReviewRequired: boolean;
  falsePositivePossible: boolean;
  detectorVersion: string;
  schemaVersion: string;
  organizationScope: string;
  candidateScope: string;
  createdTimestamp: string;
}

export interface MaskingOperation {
  findingId: string;
  type: "text" | "image_region" | "qr" | "barcode";
  replacement: string;
}

export interface RemovalOperation {
  findingId: string;
  type: "metadata" | "embedded_link" | "external_link";
  strategy: "strip" | "neutralize";
}

export interface ProtectionPlan {
  planId: string;
  organizationScope: string;
  candidateScope: string;
  originalObjectReference: string;
  originalImmutableReference: string;
  protectedCopyTargetReference: string;
  publicProfileTargetReference: string;
  findingsIncluded: string[];
  maskingOperations: MaskingOperation[];
  removalOperations: RemovalOperation[];
  replacementPlaceholders: string[];
  metadataStripping: boolean;
  qrMasking: boolean;
  barcodeMasking: boolean;
  linkNeutralization: boolean;
  textRedaction: boolean;
  imageRegionRedaction: boolean;
  protectionStatus: ProtectionPlanStatus;
  reviewStatus: ProtectionReviewStatus;
  currentDisclosureManifest: DisclosureManifest;
  allowedFutureDisclosureTransitions: DisclosureTransitionRule[];
  deniedTransitions: DisclosureTransitionRule[];
  transitionPrerequisites: string[];
  policyVersion: string;
  workflowStageRequirement: RecruitmentWorkflowStage | "any";
  consentRequirement: string | null;
  staffApprovalRequirement: boolean;
  paymentRequirement: "not_required" | "required";
  contractStateRequirement: "not_required" | "required" | "must_be_signed";
  activeFreezeRestriction: boolean;
  criticalViolationRestriction: boolean;
  transitionHistory: DisclosureTransitionHistoryEntry[];
  rollbackTarget: DisclosureManifest | null;
  irreversibleFields: DisclosureFieldCategory[];
  expiryTimestamp: string | null;
  revocationTimestamp: string | null;
  generatedTimestamp: string;
  protectionVersion: string;
}

export interface DisclosureManifestFieldEntry {
  fieldCategory: DisclosureFieldCategory;
  disclosureState: DisclosureState;
  employerVisible: boolean;
  rationale: string;
}

export interface DisclosureManifest {
  manifestId: string;
  protectionLevel: ProtectionLevel;
  fields: DisclosureManifestFieldEntry[];
  createdAt: string;
  schemaVersion: string;
}

export interface DisclosureTransitionRule {
  fieldCategory: DisclosureFieldCategory;
  from: DisclosureState;
  to: DisclosureState;
  allowed: boolean;
  policyRequired: boolean;
  staffApprovalRequired: boolean;
  reasonCode: string;
}

export interface DisclosureTransitionHistoryEntry {
  transitionId: string;
  fieldCategory: DisclosureFieldCategory;
  from: DisclosureState;
  to: DisclosureState;
  approvedBy: string | null;
  reasonCode: string;
  createdAt: string;
}

export interface AdaptiveProtectionContext {
  recruitmentWorkflowStage: RecruitmentWorkflowStage;
  actorRole: AnalysisActor["role"];
  organizationScope: string;
  tenantScope: string | null;
  policyVersion: string;
  candidateConsentVersion: string;
  employerVerificationStatus: "unverified" | "pending" | "verified";
  interviewStatus: "not_started" | "scheduled" | "in_progress" | "completed" | "cancelled";
  paymentStatus: "not_applicable" | "pending" | "verified" | "failed";
  contractState: "not_started" | "draft" | "review" | "signed" | "closed";
  activeFreezeState: boolean;
  activeCriticalViolationState: boolean;
  authorizedStaffOverride: boolean;
  fieldLevelDisclosurePolicy: string;
}

export interface ExplainableProtectionDecision {
  decisionId: string;
  policyId: string;
  policyVersion: string;
  ruleId: string;
  protectionLevel: ProtectionLevel;
  fieldOrFindingCategory: string;
  previousDisclosureState: DisclosureState;
  resultingDisclosureState: DisclosureState;
  reasonCode: string;
  internalExplanation: string;
  candidateFriendlyExplanation: string;
  employerFriendlyExplanation: string;
  evaluatedWorkflowStage: RecruitmentWorkflowStage;
  evaluatedActorRole: AnalysisActor["role"];
  evaluatedOrganizationScope: string;
  evaluatedConsentVersion: string;
  evaluatedConditions: string[];
  passedConditions: string[];
  failedConditions: string[];
  blockingReasons: string[];
  requiredNextActions: string[];
  decisionOrigin: DecisionOrigin;
  confidence: number | null;
  humanReviewRequirement: boolean;
  staffOverrideEligibility: boolean;
  createdTimestamp: string;
  schemaVersion: string;
  feedbackStatus: DecisionFeedbackStatus;
  ruleDecisionReference: ProtectionRuleDecisionReference | null;
}

export interface ProtectionRuleDecisionReference {
  ruleId: string;
  ruleVersion: string;
  registryVersion: string;
  policyIds: string[];
  businessRuleIds: string[];
  ruleSnapshotHash: string;
  resolutionTimestamp: string;
  effectiveDateUsed: string;
  fallbackApplied: boolean;
  deprecatedRuleWarning: boolean;
  humanReviewRequirement: boolean;
}

export interface DocumentAnalysisQuarantine {
  quarantineId: string;
  fileReference: string;
  candidateId: string;
  organizationId: string;
  status: QuarantineStatus;
  fileType: SupportedFileCategory;
  size: number;
  contentHash: string;
  analysisAttemptCount: number;
  providerResults: ProviderResultEnvelope[];
  protectionPlanReference: string | null;
  expiryTimestamp: string;
  reviewRequirement: boolean;
  failureReasonCategory: QuarantineFailureReasonCategory | null;
}

export interface ProviderResultEnvelope {
  provider: AnalysisProviderName;
  success: boolean;
  summary: string;
  confidenceScore: number;
  findings: Array<Partial<ProtectionFinding>>;
  durationMs: number;
  timeout: boolean;
  schemaVersion: string;
}

export interface FileEnvelope {
  fileName: string;
  declaredMimeType: string;
  fileReference: string;
  originalObjectReference: string;
  protectedCopyTargetReference: string;
  publicProfileTargetReference: string;
  byteSize: number;
  contentHash: string;
}

export interface AnalysisActor {
  actorId: string;
  role: "candidate" | "employer" | "prime_global_staff" | "system";
}

export interface OwnershipContext {
  candidateId: string;
  organizationId: string;
}

export interface AnalysisRequest {
  analysisId: string;
  actor: AnalysisActor;
  ownership: OwnershipContext;
  file: FileEnvelope;
  requestedAt: string;
  candidateMessageLocale: "en" | "ar";
}

export interface AnalysisSafetyLimits {
  maxFileSizeBytes: number;
  maxPages: number;
  maxImagePixels: number;
  maxArchiveDepth: number;
  extractionTimeoutMs: number;
  providerTimeoutMs: number;
}

export interface CandidateTimelineEntry {
  timelineCode: "document_prepared_securely";
  message: string;
  createdAt: string;
}

export interface DocumentAnalysisAuditEntry {
  auditId: string;
  quarantineId: string;
  event: string;
  provider: AnalysisProviderName | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface EmployerSafeDocumentStatus {
  analysisId: string;
  candidateId: string;
  organizationId: string;
  protectedCopyReady: boolean;
  protectionStatus: ProtectionPlanStatus;
  protectedCopyReference: string | null;
}

export interface AnalysisOutcome {
  analysisId: string;
  quarantine: DocumentAnalysisQuarantine;
  findings: ProtectionFinding[];
  protectionPlan: ProtectionPlan | null;
  explainableDecisions: ExplainableProtectionDecision[];
  candidateNotification: string | null;
  timelineEntry: CandidateTimelineEntry;
  auditEntries: DocumentAnalysisAuditEntry[];
  policyEngineNotified: boolean;
  failedSafe: boolean;
}

export interface AnalysisIdempotencyStore {
  get(analysisId: string): Promise<AnalysisOutcome | null>;
  set(outcome: AnalysisOutcome): Promise<void>;
}

export interface EmployerSafeDisclosureProjection {
  analysisId: string;
  protectionLevel: ProtectionLevel;
  fields: Array<{ fieldCategory: DisclosureFieldCategory; disclosureState: DisclosureState }>;
}
