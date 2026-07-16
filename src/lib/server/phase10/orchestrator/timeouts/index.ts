export interface TimeoutPolicy {
  policyId: string;
  absoluteDeadlineAt?: string | null;
  relativeDurationMs?: number | null;
  gracePeriodMs: number;
  timeoutAction: string;
  escalationAction: string;
  retryBeforeExpiry: boolean;
  notificationSchedule: Array<{ offsetMs: number; template: string }>;
  manualOverrideAllowed: boolean;
  evidenceRequired: boolean;
  auditRequired: boolean;
}

export interface TimeoutEvaluationResult {
  expired: boolean;
  timeoutAt: string | null;
  escalationRequired: boolean;
  nextNotifications: Array<{ scheduledAt: string; template: string }>;
}

export function evaluateTimeoutPolicy(policy: TimeoutPolicy, input: { startedAt: string; now?: Date }): TimeoutEvaluationResult {
  const now = input.now ?? new Date();
  const startedAt = new Date(input.startedAt).getTime();

  const absolute = policy.absoluteDeadlineAt ? new Date(policy.absoluteDeadlineAt).getTime() : null;
  const relative = policy.relativeDurationMs ? startedAt + policy.relativeDurationMs : null;

  let timeoutAtMs: number | null = null;
  if (absolute !== null && relative !== null) timeoutAtMs = Math.min(absolute, relative);
  else timeoutAtMs = absolute ?? relative;

  const timeoutAt = timeoutAtMs !== null ? new Date(timeoutAtMs).toISOString() : null;
  const expired = timeoutAtMs !== null && now.getTime() > timeoutAtMs + policy.gracePeriodMs;

  const nextNotifications = policy.notificationSchedule
    .map((entry) => ({
      scheduledAt: new Date((timeoutAtMs ?? startedAt) - entry.offsetMs).toISOString(),
      template: entry.template,
    }))
    .filter((entry) => new Date(entry.scheduledAt).getTime() >= now.getTime());

  return {
    expired,
    timeoutAt,
    escalationRequired: expired,
    nextNotifications,
  };
}

export const orchestratorTimeoutPolicyFoundations: TimeoutPolicy[] = [
  {
    policyId: "interview-invitation-72h",
    relativeDurationMs: 72 * 60 * 60 * 1000,
    gracePeriodMs: 30 * 60 * 1000,
    timeoutAction: "expire_interview_invitation",
    escalationAction: "staff_review_required",
    retryBeforeExpiry: false,
    notificationSchedule: [{ offsetMs: 24 * 60 * 60 * 1000, template: "candidate_acceptance_reminder" }],
    manualOverrideAllowed: true,
    evidenceRequired: true,
    auditRequired: true,
  },
  {
    policyId: "payment-confirmation-timeout",
    relativeDurationMs: 7 * 24 * 60 * 60 * 1000,
    gracePeriodMs: 60 * 60 * 1000,
    timeoutAction: "payment_timeout",
    escalationAction: "manual_review",
    retryBeforeExpiry: true,
    notificationSchedule: [{ offsetMs: 24 * 60 * 60 * 1000, template: "payment_confirmation_reminder" }],
    manualOverrideAllowed: true,
    evidenceRequired: true,
    auditRequired: true,
  },
];
