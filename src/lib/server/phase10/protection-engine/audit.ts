import type { PGPEProtectionAuditRecord, PGPEProtectionResult } from "./types.ts";

export function createPGPEProtectionAuditRecord(sourceId: string, result: PGPEProtectionResult): PGPEProtectionAuditRecord {
  return {
    auditId: `pgpe-audit:${sourceId}:${Date.now()}`,
    sourceId,
    detector: result.detector,
    confidence: result.confidence,
    reason: result.reason,
    evidenceReference: result.evidenceReference,
    suggestedAction: result.suggestedAction,
    protectionAction: result.protectionAction,
    humanReviewRequired: result.humanReviewRequired,
    falsePositivePossible: result.falsePositivePossible,
    createdAt: new Date().toISOString(),
  };
}