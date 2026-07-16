import { createHash, randomUUID } from "node:crypto";
import type { ExplainableEvidenceReference } from "./types.ts";

export function createExplainableEvidenceReference(input: {
  sourceType: ExplainableEvidenceReference["sourceType"];
  sourceReference: string;
  rationale: string;
  metadata: Record<string, unknown>;
}): ExplainableEvidenceReference {
  const serialized = JSON.stringify({
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    rationale: input.rationale,
    metadata: input.metadata,
  });

  return {
    evidenceId: `trust-evidence:${randomUUID()}`,
    evidenceHash: createHash("sha256").update(serialized).digest("hex"),
    sourceType: input.sourceType,
    sourceReference: input.sourceReference,
    rationale: input.rationale,
    createdAt: new Date().toISOString(),
  };
}

export function collectEvidenceIds(references: ExplainableEvidenceReference[]): string[] {
  return references.map((entry) => entry.evidenceId);
}
