import type { AdvisoryReviewDecision } from "./types.ts";

export function evaluateAdvisoryRecommendation(input: {
  overallConfidence: number;
  needsManualReview: boolean;
}): AdvisoryReviewDecision {
  if (input.needsManualReview) {
    return {
      recommendation: "advisory_needs_manual_review",
      reviewStatus: "needs_manual_review",
      reason: "manual_review_flag_detected",
    };
  }

  if (input.overallConfidence >= 0.8) {
    return {
      recommendation: "advisory_fit",
      reviewStatus: "pending_review",
      reason: "high_confidence_advisory",
    };
  }

  if (input.overallConfidence >= 0.55) {
    return {
      recommendation: "advisory_partial_fit",
      reviewStatus: "pending_review",
      reason: "medium_confidence_advisory",
    };
  }

  return {
    recommendation: "advisory_low_confidence",
    reviewStatus: "needs_manual_review",
    reason: "low_confidence_requires_manual_review",
  };
}
