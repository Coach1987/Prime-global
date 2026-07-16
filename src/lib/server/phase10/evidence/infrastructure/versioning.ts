import type { Phase10EvidenceEventRecord } from "../types.ts";
import type { Phase10EvidenceEnvelope } from "./types.ts";

export const PHASE10_EVIDENCE_SCHEMA_V1 = 1;
export const PHASE10_EVIDENCE_SUPPORTED_SCHEMA_VERSIONS = [PHASE10_EVIDENCE_SCHEMA_V1] as const;
export const PHASE10_EVIDENCE_CURRENT_SCHEMA_VERSION = PHASE10_EVIDENCE_SCHEMA_V1;

export function isSupportedEvidenceSchemaVersion(version: number): boolean {
  return PHASE10_EVIDENCE_SUPPORTED_SCHEMA_VERSIONS.includes(version as (typeof PHASE10_EVIDENCE_SUPPORTED_SCHEMA_VERSIONS)[number]);
}

export function toVersionedEvidenceEnvelope(
  event: Phase10EvidenceEventRecord,
  schemaVersion = PHASE10_EVIDENCE_CURRENT_SCHEMA_VERSION
): Phase10EvidenceEnvelope<Phase10EvidenceEventRecord> {
  return {
    schemaVersion,
    evidenceCaseId: event.evidence_case_id,
    eventId: event.id,
    recordedAt: event.created_at,
    payload: event,
  };
}

export function assertSupportedEnvelopeVersion(envelope: Phase10EvidenceEnvelope) {
  if (!isSupportedEvidenceSchemaVersion(envelope.schemaVersion)) {
    throw new Error(`Unsupported evidence schema version: ${envelope.schemaVersion}`);
  }
}

export function cloneEnvelope<TPayload>(envelope: Phase10EvidenceEnvelope<TPayload>): Phase10EvidenceEnvelope<TPayload> {
  return {
    schemaVersion: envelope.schemaVersion,
    evidenceCaseId: envelope.evidenceCaseId,
    eventId: envelope.eventId,
    recordedAt: envelope.recordedAt,
    payload: envelope.payload,
    unknownFields: envelope.unknownFields ? { ...envelope.unknownFields } : undefined,
  };
}
