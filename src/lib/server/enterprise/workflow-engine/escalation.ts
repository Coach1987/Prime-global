import type { WorkflowEscalationKind, WorkflowEscalationStatus, WorkflowEscalationTargetType } from "./types.ts";

export interface WorkflowEscalationSchedule {
  escalationKind: WorkflowEscalationKind;
  timeoutMinutes?: number | null;
  reminderMinutes?: number | null;
  status?: WorkflowEscalationStatus;
}

export interface WorkflowEscalationEvaluation {
  due: boolean;
  nextDueAt: string | null;
  explanation: string;
}

export function isWorkflowEscalationDue(
  createdAtIso: string,
  nowIso: string,
  schedule: WorkflowEscalationSchedule
): WorkflowEscalationEvaluation {
  const createdAt = Date.parse(createdAtIso);
  const now = Date.parse(nowIso);

  if (Number.isNaN(createdAt) || Number.isNaN(now)) {
    return {
      due: false,
      nextDueAt: null,
      explanation: "Invalid escalation timestamps.",
    };
  }

  const thresholdMinutes = schedule.timeoutMinutes ?? schedule.reminderMinutes ?? 0;
  const nextDueAt = thresholdMinutes > 0 ? new Date(createdAt + thresholdMinutes * 60_000).toISOString() : null;

  return {
    due: thresholdMinutes > 0 ? now >= createdAt + thresholdMinutes * 60_000 : false,
    nextDueAt,
    explanation: `${schedule.escalationKind} escalation evaluated successfully.`,
  };
}

export function resolveWorkflowEscalationTarget(
  targetType: WorkflowEscalationTargetType,
  targetKey: string | null
) {
  return {
    targetType,
    targetKey: targetKey ?? null,
    explanation: targetKey ? `Escalation target resolved for ${targetType}.` : `Escalation target defaults to ${targetType}.`,
  };
}
