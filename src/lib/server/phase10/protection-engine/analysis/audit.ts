import type { CandidateTimelineEntry, DocumentAnalysisAuditEntry } from "./types.ts";

export const STAGE8_CANDIDATE_TIMELINE_MESSAGE = "Your document was prepared securely for the recruitment process.";

function createAuditId(prefix: string): string {
  return `${prefix}:${Math.random().toString(36).slice(2, 12)}`;
}

export function createAuditEntry(input: {
  quarantineId: string;
  event: string;
  provider?: string | null;
  metadata?: Record<string, unknown>;
}): DocumentAnalysisAuditEntry {
  return {
    auditId: createAuditId("stage8-audit"),
    quarantineId: input.quarantineId,
    event: input.event,
    provider: (input.provider as DocumentAnalysisAuditEntry["provider"]) ?? null,
    metadata: sanitizePrivacySafeMetadata(input.metadata ?? {}),
    createdAt: new Date().toISOString(),
  };
}

export function createCandidateFriendlyTimelineEntry(): CandidateTimelineEntry {
  return {
    timelineCode: "document_prepared_securely",
    message: STAGE8_CANDIDATE_TIMELINE_MESSAGE,
    createdAt: new Date().toISOString(),
  };
}

const BLOCKED_LOG_KEYS = new Set([
  "rawExtractedText",
  "fullContent",
  "fullText",
  "documentBinary",
  "originalObjectReference",
  "originalStoragePath",
]);

export function sanitizePrivacySafeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (BLOCKED_LOG_KEYS.has(key)) continue;
    if (typeof value === "string" && value.length > 120) {
      output[key] = `${value.slice(0, 117)}...`;
      continue;
    }
    output[key] = value;
  }

  return output;
}
