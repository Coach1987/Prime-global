export interface RetryPolicy {
  policyId: string;
  maxAttempts: number;
  fixedDelayMs?: number;
  exponentialBaseMs?: number;
  jitterMs?: number;
  retryableCategories: string[];
  nonRetryableCategories: string[];
  maxElapsedMs: number;
  deadLetterTransition: string;
  manualReviewAfterExhausted: boolean;
}

export interface RetryState {
  attempts: number;
  startedAt: string;
  nextRetryAt: string | null;
  exhausted: boolean;
}

export interface RetryDecision {
  retry: boolean;
  reason: string;
  nextRetryAt: string | null;
  exhausted: boolean;
  manualReviewRequired: boolean;
}

const NEVER_RETRY = new Set([
  "unauthorized",
  "policy_denied",
  "business_rule_failed",
  "invalid_transition",
  "integrity_compromised",
  "legal_hold_conflict",
  "permanent_validation_error",
]);

export function computeRetryDelayMs(policy: RetryPolicy, attempts: number): number {
  if (policy.fixedDelayMs) return policy.fixedDelayMs;
  const base = policy.exponentialBaseMs ?? 1000;
  const exponential = base * Math.pow(2, Math.max(0, attempts - 1));
  const jitter = policy.jitterMs ? Math.floor(Math.random() * policy.jitterMs) : 0;
  return exponential + jitter;
}

export function evaluateRetryPolicy(
  policy: RetryPolicy,
  state: RetryState,
  errorCategory: string,
  now = new Date()
): RetryDecision {
  if (NEVER_RETRY.has(errorCategory) || policy.nonRetryableCategories.includes(errorCategory)) {
    return {
      retry: false,
      reason: `Error category ${errorCategory} is non-retryable.`,
      nextRetryAt: null,
      exhausted: true,
      manualReviewRequired: true,
    };
  }

  if (!policy.retryableCategories.includes(errorCategory)) {
    return {
      retry: false,
      reason: `Error category ${errorCategory} is not configured as retryable.`,
      nextRetryAt: null,
      exhausted: true,
      manualReviewRequired: true,
    };
  }

  const elapsed = now.getTime() - new Date(state.startedAt).getTime();
  if (state.attempts >= policy.maxAttempts || elapsed > policy.maxElapsedMs) {
    return {
      retry: false,
      reason: "Retry policy exhausted.",
      nextRetryAt: null,
      exhausted: true,
      manualReviewRequired: policy.manualReviewAfterExhausted,
    };
  }

  const nextRetryAt = new Date(now.getTime() + computeRetryDelayMs(policy, state.attempts + 1)).toISOString();
  return {
    retry: true,
    reason: "Retry scheduled.",
    nextRetryAt,
    exhausted: false,
    manualReviewRequired: false,
  };
}

export const defaultOrchestratorRetryPolicy: RetryPolicy = {
  policyId: "orchestrator-default",
  maxAttempts: 5,
  exponentialBaseMs: 1000,
  jitterMs: 250,
  retryableCategories: [
    "notification_delivery_failure",
    "provider_timeout",
    "transient_storage_failure",
    "temporary_database_failure",
    "webhook_verification_delay",
    "worker_interruption",
  ],
  nonRetryableCategories: [
    "unauthorized",
    "policy_denied",
    "business_rule_failed",
    "invalid_transition",
    "integrity_compromised",
    "legal_hold_conflict",
    "permanent_validation_error",
  ],
  maxElapsedMs: 24 * 60 * 60 * 1000,
  deadLetterTransition: "dead_letter",
  manualReviewAfterExhausted: true,
};
