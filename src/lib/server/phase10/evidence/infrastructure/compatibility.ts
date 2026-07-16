import type {
  Phase10EvidenceEnvelope,
  Phase10EvidenceMigrationCompatibilityResult,
  Phase10EvidenceReplayEvent,
} from "./types.ts";
import {
  PHASE10_EVIDENCE_CURRENT_SCHEMA_VERSION,
  cloneEnvelope,
  isSupportedEvidenceSchemaVersion,
} from "./versioning.ts";

function ensureUnknownFields<TPayload>(envelope: Phase10EvidenceEnvelope<TPayload>) {
  if (!envelope.unknownFields) {
    envelope.unknownFields = {};
  }
  return envelope;
}

export function normalizeForwardCompatibility<TPayload>(
  envelope: Phase10EvidenceEnvelope<TPayload>,
  targetVersion = PHASE10_EVIDENCE_CURRENT_SCHEMA_VERSION
): Phase10EvidenceMigrationCompatibilityResult<TPayload> {
  const transformed = cloneEnvelope(envelope);
  const notes: string[] = [];

  if (!isSupportedEvidenceSchemaVersion(envelope.schemaVersion)) {
    notes.push(`Source version ${envelope.schemaVersion} is unknown; preserving payload as forward-compatible.`);
    const writable = ensureUnknownFields(transformed);
    writable.unknownFields = {
      ...(writable.unknownFields ?? {}),
      sourceSchemaVersion: envelope.schemaVersion,
    };
  }

  transformed.schemaVersion = targetVersion;

  return {
    compatible: true,
    direction: "forward",
    sourceVersion: envelope.schemaVersion,
    targetVersion,
    notes,
    transformedEnvelope: transformed,
  };
}

export function normalizeBackwardCompatibility<TPayload>(
  envelope: Phase10EvidenceEnvelope<TPayload>,
  targetVersion: number
): Phase10EvidenceMigrationCompatibilityResult<TPayload> {
  const transformed = cloneEnvelope(envelope);
  const notes: string[] = [];

  if (targetVersion > envelope.schemaVersion) {
    notes.push("Backward normalization requested to a newer target; payload is returned unchanged.");
  }

  if (!isSupportedEvidenceSchemaVersion(targetVersion)) {
    notes.push(`Target version ${targetVersion} is not recognized; preserving unknown fields for replay safety.`);
  }

  const writable = ensureUnknownFields(transformed);
  writable.unknownFields = {
    ...(writable.unknownFields ?? {}),
    downgradedFromVersion: envelope.schemaVersion,
  };
  transformed.schemaVersion = targetVersion;

  return {
    compatible: true,
    direction: "backward",
    sourceVersion: envelope.schemaVersion,
    targetVersion,
    notes,
    transformedEnvelope: transformed,
  };
}

export function applyReplayCompatibility(
  replayEvents: Phase10EvidenceReplayEvent[],
  targetVersion = PHASE10_EVIDENCE_CURRENT_SCHEMA_VERSION
): Phase10EvidenceReplayEvent[] {
  return replayEvents.map((entry) => {
    const normalized = normalizeForwardCompatibility(entry.envelope, targetVersion);
    return {
      ...entry,
      envelope: normalized.transformedEnvelope,
    };
  });
}
