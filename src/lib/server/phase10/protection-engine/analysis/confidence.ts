import type { ConfidenceLevel, ConfidenceModel } from "./types.ts";

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
}

export function confidenceLevelFromScore(score: number): ConfidenceLevel {
  const normalized = clampScore(score);
  if (normalized >= 0.9) return "very_high";
  if (normalized >= 0.75) return "high";
  if (normalized >= 0.5) return "medium";
  return "low";
}

export function createConfidenceModel(score: number, explanation: string): ConfidenceModel {
  const normalizedScore = clampScore(score);
  return {
    level: confidenceLevelFromScore(normalizedScore),
    score: normalizedScore,
    explanation,
  };
}

export function shouldNotifyCandidate(level: ConfidenceLevel): boolean {
  return level === "high" || level === "very_high";
}

export function shouldAppendEvidence(level: ConfidenceLevel): boolean {
  return level === "very_high";
}

export function shouldNotifyPolicyEngine(level: ConfidenceLevel): boolean {
  return level === "very_high";
}
