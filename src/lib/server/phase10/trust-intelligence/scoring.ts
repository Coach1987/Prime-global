import type { ProgressiveConfidenceScore, ProgressiveConfidenceScoreStep } from "./types.ts";

function normalize(raw: number): number {
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return Number(raw.toFixed(4));
}

function confidenceLevel(score: number): ProgressiveConfidenceScore["level"] {
  if (score >= 0.85) return "very_high";
  if (score >= 0.65) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

export function createProgressiveConfidenceScore(input: {
  baseScore: number;
  steps: ProgressiveConfidenceScoreStep[];
  summary: string;
}): ProgressiveConfidenceScore {
  const aggregate = input.steps.reduce((total, step) => total + step.contribution, input.baseScore);
  const normalizedScore = normalize(aggregate);

  return {
    score: aggregate,
    normalizedScore,
    level: confidenceLevel(normalizedScore),
    steps: input.steps,
    explainableSummary: input.summary,
  };
}
