import type { WorkflowAuditOutcome, WorkflowAuthorType, WorkflowEventEnvelope } from "./types.ts";

export interface WorkflowAuditEntryInput {
  workflowInstanceId: string;
  actionCode: string;
  actorType: WorkflowAuthorType;
  actorKey: string;
  outcome: WorkflowAuditOutcome;
  reason: string;
  recordState?: Record<string, unknown>;
  timestamp?: string;
}

export function createWorkflowEventEnvelope(input: WorkflowEventEnvelope) {
  return {
    ...input,
    immutable: true,
  };
}

export function createWorkflowAuditEntry(input: WorkflowAuditEntryInput) {
  return {
    workflowInstanceId: input.workflowInstanceId,
    actionCode: input.actionCode,
    actorType: input.actorType,
    actorKey: input.actorKey,
    outcome: input.outcome,
    reason: input.reason,
    recordState: input.recordState ?? {},
    createdAt: input.timestamp ?? new Date().toISOString(),
  };
}

export function createWorkflowHistoryEntry(input: {
  workflowInstanceId: string;
  entryType: string;
  fromStateName?: string | null;
  toStateName?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}) {
  return {
    workflowInstanceId: input.workflowInstanceId,
    entryType: input.entryType,
    fromStateName: input.fromStateName ?? null,
    toStateName: input.toStateName ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
    createdAt: input.timestamp ?? new Date().toISOString(),
  };
}
