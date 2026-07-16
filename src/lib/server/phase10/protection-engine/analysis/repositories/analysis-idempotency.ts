import type { AnalysisIdempotencyStore, AnalysisOutcome } from "../types.ts";

export function createInMemoryAnalysisIdempotencyStore(): AnalysisIdempotencyStore {
  const store = new Map<string, AnalysisOutcome>();

  return {
    async get(analysisId) {
      return store.get(analysisId) ?? null;
    },

    async set(outcome) {
      store.set(outcome.analysisId, outcome);
    },
  };
}
