import { randomUUID } from "node:crypto";
import { collectEvidenceIds } from "./evidence.ts";
import type { CandidateFriendlyRecommendationResult, RiskAggregateResult } from "./types.ts";

function recommendationMessage(level: RiskAggregateResult["riskLevel"]): { title: string; explanation: string; nextSteps: string[] } {
  if (level === "low") {
    return {
      title: "Continue Normally",
      explanation: "Everything looks consistent so far. Your recruitment process can continue normally.",
      nextSteps: ["Continue with the current recruitment stage."],
    };
  }

  if (level === "medium") {
    return {
      title: "Continue With Quick Review",
      explanation: "A few patterns need a quick Prime Global staff review to keep everyone protected.",
      nextSteps: ["Continue the process while staff confirms context.", "Avoid sharing direct contact details."],
    };
  }

  if (level === "high" || level === "very_high") {
    return {
      title: "Staff-Assisted Continuation",
      explanation: "Prime Global will keep the process moving with extra staff assistance to protect both sides.",
      nextSteps: ["Continue using protected communication channels.", "Wait for staff guidance before sharing external links."],
    };
  }

  return {
    title: "Continue Normally",
    explanation: "The process can continue.",
    nextSteps: ["Continue with the current recruitment stage."],
  };
}

export function createCandidateFriendlyRecommendation(input: {
  aggregate: RiskAggregateResult;
}): CandidateFriendlyRecommendationResult {
  const summary = recommendationMessage(input.aggregate.riskLevel);
  const recommendation = {
    recommendationId: `trust-rec:${randomUUID()}`,
    title: summary.title,
    explanation: summary.explanation,
    nextSteps: summary.nextSteps,
    continuationAllowed: true,
    humanReviewAvailable: true,
    evidenceReferenceIds: collectEvidenceIds(input.aggregate.evidenceReferences),
  };

  return {
    recommendations: [recommendation],
    candidateMessage:
      input.aggregate.riskLevel === "low"
        ? "Your process continues normally. Prime Global will keep protecting your information."
        : "Your process continues with staff support to keep recruitment safe and fair.",
    continuationStatus: input.aggregate.recommendedHumanReview ? "continue_with_review" : "continue_normally",
  };
}
