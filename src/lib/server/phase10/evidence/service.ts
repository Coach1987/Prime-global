import { randomUUID } from "node:crypto";
import type {
  Phase10EvidenceAccessInput,
  Phase10EvidenceChainVerificationResult,
  Phase10EvidenceCorrectionInput,
  Phase10EvidenceCreateInput,
  Phase10EvidenceEventRecord,
  Phase10EvidenceExportRequestInput,
  Phase10EvidenceLegalHoldInput,
  Phase10EvidenceLookupResult,
  Phase10EvidenceRepository,
  Phase10EvidenceServiceDependencies,
} from "./types.ts";
import { computeEvidenceEventHash, sha256Hex, stableStringify } from "./hash.ts";

function buildEventHashPayload(event: Omit<Phase10EvidenceEventRecord, "id" | "created_at" | "updated_at">) {
  return {
    evidence_case_id: event.evidence_case_id,
    organization_id: event.organization_id,
    tenant_id: event.tenant_id,
    actor_auth_user_id: event.actor_auth_user_id,
    actor_role: event.actor_role,
    event_type: event.event_type,
    subject_type: event.subject_type,
    subject_id: event.subject_id,
    conversation_id: event.conversation_id,
    interview_id: event.interview_id,
    message_id: event.message_id,
    attachment_id: event.attachment_id,
    payment_reference: event.payment_reference,
    contract_reference: event.contract_reference,
    detection_source: event.detection_source,
    content_hash: event.content_hash,
    previous_event_hash: event.previous_event_hash,
    secure_object_ref: event.secure_object_ref,
    redacted_excerpt: event.redacted_excerpt,
    normalized_summary: event.normalized_summary,
    privacy_classification: event.privacy_classification,
    jurisdiction_tag: event.jurisdiction_tag,
    retention_status: event.retention_status,
    legal_hold_state: event.legal_hold_state,
    export_authorization_state: event.export_authorization_state,
    staff_decision_reference: event.staff_decision_reference,
    appeal_reference: event.appeal_reference,
    appeal_history: event.appeal_history,
    override_history: event.override_history,
    correction_of_event_id: event.correction_of_event_id,
    metadata: event.metadata,
  };
}

function createEventHash(event: Omit<Phase10EvidenceEventRecord, "id" | "created_at" | "updated_at">) {
  return computeEvidenceEventHash(buildEventHashPayload(event));
}

async function resolveCaseId(
  repository: Phase10EvidenceRepository,
  input: { evidenceCaseId?: string | null; correctionOfEventId?: string | null }
): Promise<{ evidenceCaseId: string; previousEventHash: string | null }> {
  if (input.evidenceCaseId) {
    const latest = await repository.findLatestEvidenceEventByCaseId(input.evidenceCaseId);
    return {
      evidenceCaseId: input.evidenceCaseId,
      previousEventHash: latest?.evidence_hash ?? null,
    };
  }

  if (input.correctionOfEventId) {
    const source = await repository.findEvidenceEventById(input.correctionOfEventId);
    if (!source) {
      throw new Error("Source evidence event not found");
    }

    const latest = await repository.findLatestEvidenceEventByCaseId(source.evidence_case_id);
    return {
      evidenceCaseId: source.evidence_case_id,
      previousEventHash: latest?.evidence_hash ?? null,
    };
  }

  return {
    evidenceCaseId: randomUUID(),
    previousEventHash: null,
  };
}

export async function createPhase10EvidenceEvent(
  dependencies: Phase10EvidenceServiceDependencies,
  input: Phase10EvidenceCreateInput
) {
  const { repository } = dependencies;
  const caseResolution = await resolveCaseId(repository, {
    evidenceCaseId: input.evidenceCaseId,
    correctionOfEventId: input.correctionOfEventId,
  });

  const baseEvent: Omit<Phase10EvidenceEventRecord, "id" | "created_at" | "updated_at"> = {
    evidence_case_id: caseResolution.evidenceCaseId,
    organization_id: input.actor.organization.organizationId,
    tenant_id: input.actor.organization.tenantId,
    actor_auth_user_id: input.actor.actorId,
    actor_role: input.actor.actorRole,
    event_type: input.eventType,
    subject_type: input.subjectType,
    subject_id: input.subjectId ?? null,
    conversation_id: input.conversationId ?? null,
    interview_id: input.interviewId ?? null,
    message_id: input.messageId ?? null,
    attachment_id: input.attachmentId ?? null,
    payment_reference: input.paymentReference ?? null,
    contract_reference: input.contractReference ?? null,
    detection_source: input.detectionSource,
    content_hash: input.contentHash,
    evidence_hash: "",
    previous_event_hash: caseResolution.previousEventHash,
    secure_object_ref: input.secureObjectRef ?? null,
    redacted_excerpt: input.redactedExcerpt ?? null,
    normalized_summary: input.normalizedSummary ?? null,
    privacy_classification: input.privacyClassification,
    jurisdiction_tag: input.jurisdictionTag,
    retention_status: input.retentionStatus ?? "active",
    legal_hold_state: input.legalHoldState ?? "none",
    export_authorization_state: input.exportAuthorizationState ?? "not_requested",
    staff_decision_reference: input.staffDecisionReference ?? null,
    appeal_reference: input.appealReference ?? null,
    appeal_history: input.appealHistory ?? [],
    override_history: input.overrideHistory ?? [],
    correction_of_event_id: input.correctionOfEventId ?? null,
    metadata: input.metadata ?? {},
  };

  const evidenceHash = createEventHash(baseEvent);
  const event = await repository.insertEvidenceEvent({
    ...baseEvent,
    evidence_hash: evidenceHash,
  });

  return event;
}

export async function appendPhase10EvidenceCorrection(
  dependencies: Phase10EvidenceServiceDependencies,
  input: Phase10EvidenceCorrectionInput
) {
  const source = await dependencies.repository.findEvidenceEventById(input.sourceEvidenceEventId);
  if (!source) {
    throw new Error("Source evidence event not found");
  }

  return createPhase10EvidenceEvent(dependencies, {
    actor: input.actor,
    eventType: "correction",
    subjectType: source.subject_type,
    subjectId: source.subject_id,
    conversationId: source.conversation_id,
    interviewId: source.interview_id,
    messageId: source.message_id,
    attachmentId: source.attachment_id,
    paymentReference: source.payment_reference,
    contractReference: source.contract_reference,
    detectionSource: source.detection_source,
    contentHash: input.contentHash,
    privacyClassification: source.privacy_classification,
    jurisdictionTag: source.jurisdiction_tag,
    retentionStatus: source.retention_status,
    legalHoldState: source.legal_hold_state,
    exportAuthorizationState: source.export_authorization_state,
    secureObjectRef: source.secure_object_ref,
    redactedExcerpt: input.redactedExcerpt ?? source.redacted_excerpt,
    normalizedSummary: input.normalizedSummary ?? source.normalized_summary,
    staffDecisionReference: source.staff_decision_reference,
    appealReference: source.appeal_reference,
    appealHistory: source.appeal_history,
    overrideHistory: source.override_history,
    correctionOfEventId: source.id,
    evidenceCaseId: source.evidence_case_id,
    metadata: {
      ...(source.metadata ?? {}),
      ...(input.metadata ?? {}),
      correctionOfEventId: source.id,
    },
  });
}

export async function verifyPhase10EvidenceChain(
  dependencies: Phase10EvidenceServiceDependencies,
  evidenceCaseId: string
): Promise<Phase10EvidenceChainVerificationResult> {
  const events = await dependencies.repository.findEvidenceEventsByCaseId(evidenceCaseId);
  const mismatches: Array<{ eventId: string; issue: string }> = [];

  let previousHash: string | null = null;
  for (const event of events) {
    if (event.previous_event_hash !== previousHash) {
      mismatches.push({
        eventId: event.id,
        issue: previousHash === null ? "Expected a null previous hash at chain start." : "Previous hash does not match the prior event.",
      });
    }

    const recalculatedHash = createEventHash(event);
    if (recalculatedHash !== event.evidence_hash) {
      mismatches.push({
        eventId: event.id,
        issue: "Evidence hash does not match the current event payload.",
      });
    }

    previousHash = event.evidence_hash;
  }

  return {
    evidenceCaseId,
    isValid: mismatches.length === 0,
    verifiedEventCount: events.length,
    mismatchCount: mismatches.length,
    mismatches,
  };
}

export async function recordPhase10EvidenceAccess(
  dependencies: Phase10EvidenceServiceDependencies,
  input: Phase10EvidenceAccessInput
) {
  const targetEvent = input.evidenceEventId ? await dependencies.repository.findEvidenceEventById(input.evidenceEventId) : null;
  const evidenceCaseId = input.evidenceCaseId ?? targetEvent?.evidence_case_id;
  if (!evidenceCaseId) {
    throw new Error("Evidence case not found");
  }

  return dependencies.repository.insertEvidenceAccessAudit({
    evidence_event_id: targetEvent?.id ?? input.evidenceEventId ?? null,
    evidence_case_id: evidenceCaseId,
    actor_auth_user_id: input.actor.actorId,
    actor_role: input.actor.actorRole,
    organization_id: input.actor.organization.organizationId,
    tenant_id: input.actor.organization.tenantId,
    access_action: input.accessAction,
    access_decision: "allowed",
    reason: input.reason,
    policy_name: input.policyName ?? null,
    policy_version: input.policyVersion ?? null,
    request_id: input.actor.requestId,
    metadata: {
      ...(input.metadata ?? {}),
      eventType: targetEvent?.event_type ?? null,
    },
  });
}

export async function requestPhase10ExportAuthorization(
  dependencies: Phase10EvidenceServiceDependencies,
  input: Phase10EvidenceExportRequestInput
) {
  const targetEvent = input.evidenceEventId ? await dependencies.repository.findEvidenceEventById(input.evidenceEventId) : null;
  const evidenceCaseId = input.evidenceCaseId ?? targetEvent?.evidence_case_id;
  if (!evidenceCaseId) {
    throw new Error("Evidence case not found");
  }

  return createPhase10EvidenceEvent(dependencies, {
    actor: input.actor,
    eventType: "export_requested",
    subjectType: "evidence_case",
    subjectId: evidenceCaseId,
    conversationId: targetEvent?.conversation_id ?? null,
    interviewId: targetEvent?.interview_id ?? null,
    messageId: targetEvent?.message_id ?? null,
    attachmentId: targetEvent?.attachment_id ?? null,
    paymentReference: targetEvent?.payment_reference ?? null,
    contractReference: targetEvent?.contract_reference ?? null,
    detectionSource: "staff_request",
    contentHash: sha256Hex(stableStringify({ evidenceCaseId, reason: input.reason })),
    privacyClassification: targetEvent?.privacy_classification ?? "restricted",
    jurisdictionTag: targetEvent?.jurisdiction_tag ?? "unspecified",
    retentionStatus: targetEvent?.retention_status ?? "active",
    legalHoldState: targetEvent?.legal_hold_state ?? "none",
    exportAuthorizationState: "requested",
    secureObjectRef: targetEvent?.secure_object_ref ?? null,
    redactedExcerpt: targetEvent?.redacted_excerpt ?? null,
    normalizedSummary: targetEvent?.normalized_summary ?? null,
    staffDecisionReference: null,
    appealReference: null,
    evidenceCaseId,
    metadata: {
      ...(input.metadata ?? {}),
      reason: input.reason,
    },
  });
}

export async function activatePhase10LegalHold(
  dependencies: Phase10EvidenceServiceDependencies,
  input: Phase10EvidenceLegalHoldInput
) {
  const targetEvent = input.evidenceEventId ? await dependencies.repository.findEvidenceEventById(input.evidenceEventId) : null;
  const evidenceCaseId = input.evidenceCaseId ?? targetEvent?.evidence_case_id;
  if (!evidenceCaseId) {
    throw new Error("Evidence case not found");
  }

  return createPhase10EvidenceEvent(dependencies, {
    actor: input.actor,
    eventType: input.legalHoldState === "active" ? "legal_hold_activated" : "legal_hold_released",
    subjectType: "evidence_case",
    subjectId: evidenceCaseId,
    conversationId: targetEvent?.conversation_id ?? null,
    interviewId: targetEvent?.interview_id ?? null,
    messageId: targetEvent?.message_id ?? null,
    attachmentId: targetEvent?.attachment_id ?? null,
    paymentReference: targetEvent?.payment_reference ?? null,
    contractReference: targetEvent?.contract_reference ?? null,
    detectionSource: "staff_action",
    contentHash: sha256Hex(stableStringify({ evidenceCaseId, reason: input.reason, legalHoldState: input.legalHoldState })),
    privacyClassification: "legal_hold",
    jurisdictionTag: targetEvent?.jurisdiction_tag ?? "unspecified",
    retentionStatus: targetEvent?.retention_status ?? "retained",
    legalHoldState: input.legalHoldState,
    exportAuthorizationState: targetEvent?.export_authorization_state ?? "not_requested",
    secureObjectRef: targetEvent?.secure_object_ref ?? null,
    redactedExcerpt: targetEvent?.redacted_excerpt ?? null,
    normalizedSummary: targetEvent?.normalized_summary ?? null,
    staffDecisionReference: null,
    appealReference: null,
    evidenceCaseId,
    metadata: {
      ...(input.metadata ?? {}),
      reason: input.reason,
      legalHoldState: input.legalHoldState,
    },
  });
}

export async function lookupPhase10Evidence(
  dependencies: Phase10EvidenceServiceDependencies,
  evidenceCaseId: string
): Promise<Phase10EvidenceLookupResult> {
  const events = await dependencies.repository.findEvidenceEventsByCaseId(evidenceCaseId);
  return { evidenceCaseId, events };
}

export { computeEvidenceContentHash, computeEvidenceEventHash, sha256Hex, stableStringify } from "./hash.ts";
