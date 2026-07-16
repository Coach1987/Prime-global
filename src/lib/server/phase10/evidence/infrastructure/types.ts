import type { Phase10EvidenceEventRecord, Phase10EvidenceRepository } from "../types.ts";

export interface Phase10HashProvider {
  algorithm: string;
  hash(value: string): string;
}

export interface Phase10EvidenceStorageWriteInput {
  objectKey: string;
  payload: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface Phase10EvidenceStorageReadOutput {
  objectKey: string;
  payload: string;
  contentType: string;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Phase10EvidenceStorageProvider {
  put(input: Phase10EvidenceStorageWriteInput): Promise<Phase10EvidenceStorageReadOutput>;
  get(objectKey: string): Promise<Phase10EvidenceStorageReadOutput | null>;
  remove(objectKey: string): Promise<void>;
}

export interface Phase10ClockProvider {
  now(): Date;
}

export interface Phase10IdProvider {
  nextId(prefix?: string): string;
}

export interface Phase10SignaturePayload {
  digest: string;
  keyId: string;
  algorithm: string;
  signature: string;
}

export interface Phase10CryptoProvider {
  signDigest(input: { digest: string; keyId: string }): Promise<Phase10SignaturePayload>;
  verifyDigest(input: Phase10SignaturePayload): Promise<boolean>;
}

export type Phase10TamperSeverity = "low" | "medium" | "high" | "critical";

export type Phase10TamperSignalType =
  | "hash_mismatch"
  | "broken_chain"
  | "missing_previous_hash"
  | "missing_event"
  | "version_mismatch"
  | "unknown";

export interface Phase10TamperDetectionSignal {
  eventId: string | null;
  evidenceCaseId: string;
  signalType: Phase10TamperSignalType;
  severity: Phase10TamperSeverity;
  message: string;
}

export interface Phase10TamperDetectionResult {
  evidenceCaseId: string;
  hasTampering: boolean;
  highestSeverity: Phase10TamperSeverity;
  signals: Phase10TamperDetectionSignal[];
}

export interface Phase10EvidenceIntegrityMonitorResult {
  monitorRunId: string;
  evidenceCaseId: string;
  checkedAt: string;
  enabled: boolean;
  status: "skipped" | "ok" | "tampered";
  signalCount: number;
  tamper: Phase10TamperDetectionResult;
}

export interface Phase10EvidenceMonitorDependencies {
  repository: Phase10EvidenceRepository;
  hasher: Phase10HashProvider;
  clock: Phase10ClockProvider;
  idProvider: Phase10IdProvider;
  storage: Phase10EvidenceStorageProvider;
}

export interface Phase10EvidenceEnvelope<TPayload = Record<string, unknown>> {
  schemaVersion: number;
  evidenceCaseId: string;
  eventId: string;
  recordedAt: string;
  payload: TPayload;
  unknownFields?: Record<string, unknown>;
}

export interface Phase10EvidenceReplayCursor {
  evidenceCaseId: string;
  eventId: string | null;
  position: number;
}

export interface Phase10EvidenceReplayEvent {
  event: Phase10EvidenceEventRecord;
  envelope: Phase10EvidenceEnvelope<Phase10EvidenceEventRecord>;
}

export interface Phase10EvidenceReplayInput {
  evidenceCaseId: string;
  cursor?: Phase10EvidenceReplayCursor;
  maxEvents?: number;
}

export interface Phase10EvidenceReplayResult {
  enabled: boolean;
  status: "skipped" | "completed";
  processedCount: number;
  nextCursor: Phase10EvidenceReplayCursor | null;
  events: Phase10EvidenceReplayEvent[];
}

export interface Phase10EvidenceMigrationCompatibilityResult<TPayload = Record<string, unknown>> {
  compatible: boolean;
  direction: "forward" | "backward";
  sourceVersion: number;
  targetVersion: number;
  notes: string[];
  transformedEnvelope: Phase10EvidenceEnvelope<TPayload>;
}

export interface Phase10EvidenceReplayDependencies {
  repository: Phase10EvidenceRepository;
  clock: Phase10ClockProvider;
}
