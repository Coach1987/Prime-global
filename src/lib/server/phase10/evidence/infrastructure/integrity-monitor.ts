import type { Phase10EvidenceEventRecord } from "../types.ts";
import {
  createTamperDetectionResult,
  buildTamperSignalsFromChainVerification,
} from "./tamper-detection.ts";
import { isPhase10FeatureEnabled } from "../../feature-flags/index.ts";
import type { Phase10EvidenceIntegrityMonitorResult, Phase10EvidenceMonitorDependencies } from "./types.ts";

function buildEventHashPayload(event: Phase10EvidenceEventRecord): Record<string, unknown> {
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

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createEvidenceIntegrityMonitor(dependencies: Phase10EvidenceMonitorDependencies) {
  async function runCaseCheck(evidenceCaseId: string): Promise<Phase10EvidenceIntegrityMonitorResult> {
    const monitorRunId = dependencies.idProvider.nextId("integrity");
    const checkedAt = dependencies.clock.now().toISOString();

    if (!isPhase10FeatureEnabled("SHIELD_INFRA_FOUNDATION_ENABLED") || !isPhase10FeatureEnabled("SHIELD_INTEGRITY_MONITOR_ENABLED")) {
      return {
        monitorRunId,
        evidenceCaseId,
        checkedAt,
        enabled: false,
        status: "skipped",
        signalCount: 0,
        tamper: createTamperDetectionResult(evidenceCaseId, []),
      };
    }

    const events = await dependencies.repository.findEvidenceEventsByCaseId(evidenceCaseId);
    const mismatches: Array<{ eventId: string; issue: string }> = [];

    let previousHash: string | null = null;
    for (const event of events) {
      if (event.previous_event_hash !== previousHash) {
        mismatches.push({
          eventId: event.id,
          issue:
            previousHash === null
              ? "Expected a null previous hash at chain start."
              : "Previous hash does not match the prior event.",
        });
      }

      const eventPayload = buildEventHashPayload(event);
      const recomputedHash = dependencies.hasher.hash(stableStringify(eventPayload));
      if (recomputedHash !== event.evidence_hash) {
        mismatches.push({
          eventId: event.id,
          issue: "Evidence hash does not match the current event payload.",
        });
      }

      previousHash = event.evidence_hash;
    }

    const signals = buildTamperSignalsFromChainVerification({
      evidenceCaseId,
      isValid: mismatches.length === 0,
      verifiedEventCount: events.length,
      mismatchCount: mismatches.length,
      mismatches,
    });

    const tamper = createTamperDetectionResult(evidenceCaseId, signals);

    await dependencies.storage.put({
      objectKey: `monitor/${evidenceCaseId}/${monitorRunId}.json`,
      payload: JSON.stringify(
        {
          monitorRunId,
          checkedAt,
          eventCount: events.length,
          signalCount: signals.length,
          highestSeverity: tamper.highestSeverity,
        },
        null,
        2
      ),
      contentType: "application/json",
      metadata: {
        evidenceCaseId,
        monitorRunId,
      },
    });

    return {
      monitorRunId,
      evidenceCaseId,
      checkedAt,
      enabled: true,
      status: tamper.hasTampering ? "tampered" : "ok",
      signalCount: signals.length,
      tamper,
    };
  }

  return {
    runCaseCheck,
  };
}
