import { randomUUID } from "node:crypto";
import type { HumanReviewDecision, HumanReviewPacket, RiskAggregateResult, TrustEvaluationInput } from "./types.ts";

export function createHumanReviewPacket(input: {
  evaluationInput: TrustEvaluationInput;
  aggregate: RiskAggregateResult;
}): HumanReviewPacket {
  return {
    packetId: `trust-review:${randomUUID()}`,
    organizationId: input.evaluationInput.organizationId,
    candidateId: input.evaluationInput.candidateId,
    conversationId: input.evaluationInput.conversationId,
    riskAggregate: input.aggregate,
    trustSignals: input.evaluationInput.trustSignals,
    circumventionSignals: input.evaluationInput.circumventionSignals,
    evidenceReferences: input.aggregate.evidenceReferences,
    aiSuggestion: input.aggregate.recommendedHumanReview ? "continue_with_review" : "continue_normally",
    overrideRequired: true,
    createdAt: new Date().toISOString(),
  };
}

export function applyHumanReviewOverride(input: {
  decision: HumanReviewDecision;
  aggregate: RiskAggregateResult;
}): RiskAggregateResult {
  if (!input.decision.overrideApplied) return input.aggregate;

  if (input.decision.outcome === "allow_continue") {
    return {
      ...input.aggregate,
      blockedActions: [],
      explainableSummary: `${input.aggregate.explainableSummary} Human reviewer override applied: continue normally.`,
      recommendedHumanReview: false,
    };
  }

  if (input.decision.outcome === "allow_continue_with_monitoring") {
    return {
      ...input.aggregate,
      blockedActions: input.aggregate.blockedActions.filter((action) => action !== "auto_reveal_without_staff"),
      explainableSummary: `${input.aggregate.explainableSummary} Human reviewer override applied: continue with monitoring.`,
      recommendedHumanReview: true,
    };
  }

  return {
    ...input.aggregate,
    explainableSummary: `${input.aggregate.explainableSummary} Human reviewer selected manual restriction.`,
    recommendedHumanReview: true,
  };
}
