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
  originalObjectReference: string;
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
  generatedTimestamp: string;
  protectionVersion: string;
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
