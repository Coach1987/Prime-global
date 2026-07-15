import type { Phase10OrganizationContext } from "../organization/index.ts";

export const PHASE10_EVIDENCE_PRIVACY_CLASSIFICATIONS = [
  "public",
  "internal",
  "restricted",
  "confidential",
  "prime_global_only",
  "legal_hold",
] as const;

export const PHASE10_EVIDENCE_RETENTION_STATUSES = [
  "active",
  "retained",
  "scheduled_for_deletion",
  "archived",
  "expired",
] as const;

export const PHASE10_EVIDENCE_LEGAL_HOLD_STATES = ["none", "active", "released"] as const;

export const PHASE10_EVIDENCE_EXPORT_STATES = ["not_requested", "requested", "authorized", "rejected", "exported"] as const;

export const PHASE10_EVIDENCE_EVENT_TYPES = [
  "captured",
  "correction",
  "accessed",
  "export_requested",
  "export_authorized",
  "legal_hold_activated",
  "legal_hold_released",
  "chain_verified",
  "staff_decision_recorded",
  "appeal_submitted",
  "appeal_resolved",
] as const;

export type Phase10EvidencePrivacyClassification = (typeof PHASE10_EVIDENCE_PRIVACY_CLASSIFICATIONS)[number];
export type Phase10EvidenceRetentionStatus = (typeof PHASE10_EVIDENCE_RETENTION_STATUSES)[number];
export type Phase10EvidenceLegalHoldState = (typeof PHASE10_EVIDENCE_LEGAL_HOLD_STATES)[number];
export type Phase10EvidenceExportState = (typeof PHASE10_EVIDENCE_EXPORT_STATES)[number];
export type Phase10EvidenceEventType = (typeof PHASE10_EVIDENCE_EVENT_TYPES)[number];

export interface Phase10EvidenceEventRecord {
  id: string;
  evidence_case_id: string;
  organization_id: string;
  tenant_id: string | null;
  actor_auth_user_id: string | null;
  actor_role: string;
  event_type: Phase10EvidenceEventType;
  subject_type: string;
  subject_id: string | null;
  conversation_id: string | null;
  interview_id: string | null;
  message_id: string | null;
  attachment_id: string | null;
  payment_reference: string | null;
  contract_reference: string | null;
  detection_source: string;
  content_hash: string;
  evidence_hash: string;
  previous_event_hash: string | null;
  secure_object_ref: string | null;
  redacted_excerpt: string | null;
  normalized_summary: string | null;
  privacy_classification: Phase10EvidencePrivacyClassification;
  jurisdiction_tag: string;
  retention_status: Phase10EvidenceRetentionStatus;
  legal_hold_state: Phase10EvidenceLegalHoldState;
  export_authorization_state: Phase10EvidenceExportState;
  staff_decision_reference: string | null;
  appeal_reference: string | null;
  appeal_history: unknown[];
  override_history: unknown[];
  correction_of_event_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Phase10EvidenceAccessAuditRecord {
  id: string;
  evidence_event_id: string | null;
  evidence_case_id: string;
  actor_auth_user_id: string | null;
  actor_role: string;
  organization_id: string;
  tenant_id: string | null;
  access_action: string;
  access_decision: "allowed" | "blocked" | "review";
  reason: string;
  policy_name: string | null;
  policy_version: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Phase10EvidenceActorContext {
  actorId: string;
  actorRole: string;
  organization: Phase10OrganizationContext;
  requestId: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface Phase10EvidenceCreateInput {
  actor: Phase10EvidenceActorContext;
  eventType: Phase10EvidenceEventType;
  subjectType: string;
  subjectId?: string | null;
  conversationId?: string | null;
  interviewId?: string | null;
  messageId?: string | null;
  attachmentId?: string | null;
  paymentReference?: string | null;
  contractReference?: string | null;
  detectionSource: string;
  contentHash: string;
  privacyClassification: Phase10EvidencePrivacyClassification;
  jurisdictionTag: string;
  retentionStatus?: Phase10EvidenceRetentionStatus;
  legalHoldState?: Phase10EvidenceLegalHoldState;
  exportAuthorizationState?: Phase10EvidenceExportState;
  secureObjectRef?: string | null;
  redactedExcerpt?: string | null;
  normalizedSummary?: string | null;
  staffDecisionReference?: string | null;
  appealReference?: string | null;
  appealHistory?: unknown[];
  overrideHistory?: unknown[];
  correctionOfEventId?: string | null;
  evidenceCaseId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface Phase10EvidenceCorrectionInput {
  actor: Phase10EvidenceActorContext;
  sourceEvidenceEventId: string;
  redactedExcerpt?: string | null;
  normalizedSummary?: string | null;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

export interface Phase10EvidenceAccessInput {
  actor: Phase10EvidenceActorContext;
  evidenceEventId?: string | null;
  evidenceCaseId?: string | null;
  accessAction: string;
  reason: string;
  policyName?: string | null;
  policyVersion?: string | null;
  metadata?: Record<string, unknown>;
}

export interface Phase10EvidenceExportRequestInput {
  actor: Phase10EvidenceActorContext;
  evidenceEventId?: string | null;
  evidenceCaseId?: string | null;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface Phase10EvidenceLegalHoldInput {
  actor: Phase10EvidenceActorContext;
  evidenceEventId?: string | null;
  evidenceCaseId?: string | null;
  reason: string;
  legalHoldState: Phase10EvidenceLegalHoldState;
  metadata?: Record<string, unknown>;
}

export interface Phase10EvidenceChainVerificationResult {
  evidenceCaseId: string;
  isValid: boolean;
  verifiedEventCount: number;
  mismatchCount: number;
  mismatches: Array<{
    eventId: string;
    issue: string;
  }>;
}

export interface Phase10EvidenceLookupResult {
  evidenceCaseId: string;
  events: Phase10EvidenceEventRecord[];
}

export interface Phase10EvidenceRouteAuthorizationResult {
  allowed: boolean;
  explanation: string;
  blockingReasons: string[];
  policyName: string;
  policyVersion: string;
}

export interface Phase10EvidenceRepository {
  insertEvidenceEvent(input: Omit<Phase10EvidenceEventRecord, "id" | "created_at" | "updated_at">): Promise<Phase10EvidenceEventRecord>;
  findEvidenceEventById(id: string): Promise<Phase10EvidenceEventRecord | null>;
  findEvidenceEventsByCaseId(evidenceCaseId: string): Promise<Phase10EvidenceEventRecord[]>;
  findLatestEvidenceEventByCaseId(evidenceCaseId: string): Promise<Phase10EvidenceEventRecord | null>;
  insertEvidenceAccessAudit(input: Omit<Phase10EvidenceAccessAuditRecord, "id" | "created_at">): Promise<Phase10EvidenceAccessAuditRecord>;
}

export interface Phase10EvidenceServiceDependencies {
  repository: Phase10EvidenceRepository;
  now?: () => Date;
}
