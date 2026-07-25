import type { AiPolicyRecord, AiSafetyStatus } from "./types.ts";

export function evaluateAiSafety(params: {
  policy: AiPolicyRecord | null;
  authorityLevel: number;
  riskScore: number;
}): { status: AiSafetyStatus; reason: string } {
  const policy = params.policy;

  if (policy && params.authorityLevel < policy.min_authority_level) {
    return {
      status: "blocked",
      reason: "authority_below_policy_threshold",
    };
  }

  if (policy?.requires_human_review) {
    return {
      status: "needs_review",
      reason: "human_review_required_by_policy",
    };
  }

  if (params.riskScore >= 80) {
    return {
      status: "blocked",
      reason: "risk_score_too_high",
    };
  }

  return {
    status: "passed",
    reason: "safety_passed",
  };
}
