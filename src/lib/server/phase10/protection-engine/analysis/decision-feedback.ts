import type { DecisionFeedbackStatus, ExplainableProtectionDecision } from "./types.ts";

export function applyDecisionFeedback(
  decision: ExplainableProtectionDecision,
  feedbackStatus: DecisionFeedbackStatus,
  notes?: string
): ExplainableProtectionDecision {
  return {
    ...decision,
    feedbackStatus,
    internalExplanation: notes ? `${decision.internalExplanation} Feedback: ${notes}` : decision.internalExplanation,
  };
}
