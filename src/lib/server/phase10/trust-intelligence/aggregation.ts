import { createProgressiveConfidenceScore } from "./scoring.ts";
import type {
  CircumventionSignal,
  ProgressiveConfidenceScoreStep,
  RiskAggregateResult,
  RiskAggregationEngine,
  TrustEvaluationInput,
  TrustSignal,
} from "./types.ts";

function stepFromTrustSignal(signal: TrustSignal): ProgressiveConfidenceScoreStep {
  return {
    stepId: signal.signalId,
    contribution: signal.confidence * 0.2,
    reason: signal.explanation,
    evidenceReferenceIds: signal.evidenceReferences.map((entry) => entry.evidenceId),
  };
}

function stepFromCircumventionSignal(signal: CircumventionSignal): ProgressiveConfidenceScoreStep {
  return {
    stepId: signal.signalId,
    contribution: signal.confidence * 0.25,
    reason: signal.explanation,
    evidenceReferenceIds: signal.evidenceReferences.map((entry) => entry.evidenceId),
  };
}

function riskLevel(score: number): RiskAggregateResult["riskLevel"] {
  if (score >= 0.85) return "very_high";
  if (score >= 0.65) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function blockedActions(score: number): string[] {
  if (score < 0.4) return [];
  if (score < 0.65) return ["external_link_reveal"];
  if (score < 0.85) return ["external_link_reveal", "direct_contact_reveal"];
  return ["external_link_reveal", "direct_contact_reveal", "auto_reveal_without_staff"];
}

export class Stage10RiskAggregationEngine implements RiskAggregationEngine {
  aggregate(input: TrustEvaluationInput): RiskAggregateResult {
    const trustScore = createProgressiveConfidenceScore({
      baseScore: 0.1,
      steps: input.trustSignals.map(stepFromTrustSignal),
      summary: "Progressive trust score derived from explainable trust signals.",
    });

    const circumventionScore = createProgressiveConfidenceScore({
      baseScore: 0,
      steps: input.circumventionSignals.map(stepFromCircumventionSignal),
      summary: "Progressive circumvention score derived from explainable circumvention signals.",
    });

    const riskScore = Number(Math.max(0, Math.min(1, circumventionScore.normalizedScore - trustScore.normalizedScore * 0.35)).toFixed(4));
    const flattenedEvidence = [
      ...input.trustSignals.flatMap((signal) => signal.evidenceReferences),
      ...input.circumventionSignals.flatMap((signal) => signal.evidenceReferences),
    ];

    return {
      riskScore,
      riskLevel: riskLevel(riskScore),
      trustScore,
      circumventionScore,
      blockedActions: blockedActions(riskScore),
      evidenceReferences: flattenedEvidence,
      explainableSummary: "Risk aggregate uses weighted circumvention minus trust confidence and always requires human judgement for final decisions.",
      recommendedHumanReview: input.circumventionSignals.some((signal) => signal.reviewRecommended) || riskScore >= 0.4,
    };
  }
}
