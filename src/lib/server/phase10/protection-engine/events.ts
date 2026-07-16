import type { PGPEProtectionEvent, PGPEProtectionResult } from "./types.ts";

function nowIso(): string {
  return new Date().toISOString();
}

export function createPGPEProtectionEvents(sourceId: string, result: PGPEProtectionResult): PGPEProtectionEvent[] {
  const occurredAt = nowIso();

  return [
    {
      eventType: "pgpe.protection.pipeline.started",
      sourceId,
      occurredAt,
      detector: result.detector,
      evidenceReference: result.evidenceReference,
      protectionAction: "none",
    },
    {
      eventType: "pgpe.protection.decision.created",
      sourceId,
      occurredAt,
      detector: result.detector,
      evidenceReference: result.evidenceReference,
      protectionAction: result.protectionAction,
    },
    {
      eventType: "pgpe.protection.applied",
      sourceId,
      occurredAt,
      detector: result.detector,
      evidenceReference: result.evidenceReference,
      protectionAction: result.protectionAction,
    },
    {
      eventType: "pgpe.protection.workflow.continued",
      sourceId,
      occurredAt,
      detector: result.detector,
      evidenceReference: result.evidenceReference,
      protectionAction: result.protectionAction,
    },
  ];
}