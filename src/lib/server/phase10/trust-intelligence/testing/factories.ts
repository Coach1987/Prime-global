import { randomUUID } from "node:crypto";
import { createExplainableEvidenceReference } from "../evidence.ts";
import type { CircumventionSignal, TrustSignal } from "../types.ts";

export function createTrustSignal(overrides: Partial<TrustSignal> = {}): TrustSignal {
  const evidence =
    overrides.evidenceReferences ??
    [
      createExplainableEvidenceReference({
        sourceType: "message",
        sourceReference: "conversation:1:message:1",
        rationale: "Trust signal sample evidence",
        metadata: { sample: true },
      }),
    ];

  return {
    signalId: `trust-signal:${randomUUID()}`,
    signalType: "identity_consistency",
    confidence: 0.7,
    severity: "medium",
    explanation: "Identity attributes were consistent across interactions.",
    evidenceReferences: evidence,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createCircumventionSignal(overrides: Partial<CircumventionSignal> = {}): CircumventionSignal {
  const evidence =
    overrides.evidenceReferences ??
    [
      createExplainableEvidenceReference({
        sourceType: "message",
        sourceReference: "conversation:1:message:2",
        rationale: "Circumvention signal sample evidence",
        metadata: { sample: true },
      }),
    ];

  return {
    signalId: `circumvention-signal:${randomUUID()}`,
    signalType: "contact_bypass_pattern",
    confidence: 0.6,
    severity: "medium",
    explanation: "Message included contact bypass phrasing.",
    evidenceReferences: evidence,
    reviewRecommended: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
