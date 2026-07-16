import type { WorkflowType } from "../../workflow/index.ts";

export type OrchestrationType =
  | "ProtectedRecruitmentOrchestration"
  | "InterviewOrchestration"
  | "HiringOrchestration"
  | "PaymentAndContractOrchestration"
  | "AppealOrchestration"
  | "ViolationReviewOrchestration";

export type OrchestrationStatus =
  | "pending"
  | "running"
  | "waiting"
  | "retry_scheduled"
  | "completed"
  | "failed"
  | "compensating"
  | "compensated"
  | "partially_compensated"
  | "manual_review"
  | "cancelled"
  | "expired";

export type OrchestrationRecoveryState =
  | "healthy"
  | "recovery_required"
  | "recovering"
  | "recovered"
  | "recovery_failed"
  | "manual_review_required"
  | "compromised";

export interface OrchestrationIdentity {
  orchestrationId: string;
  orchestrationType: OrchestrationType;
  orchestrationVersion: string;
  schemaVersion: number;
  graphDefinitionVersion: string;
}

export interface OrchestrationScope {
  organizationId: string;
  tenantId: string | null;
  candidateId: string | null;
  employerId: string | null;
  jobId: string | null;
  applicationId: string | null;
}

export interface OrchestrationTiming {
  createdAt: string;
  updatedAt: string;
  nextScheduledActionAt: string | null;
  timeoutAt: string | null;
}

export interface OrchestrationState {
  identity: OrchestrationIdentity;
  status: OrchestrationStatus;
  currentNodeId: string;
  scope: OrchestrationScope;
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string;
  expectedVersion?: number;
  orchestrationVersionNumber: number;
  timing: OrchestrationTiming;
  metadata: Record<string, unknown>;
  humanReviewRequired: boolean;
  lastErrorCategory: string | null;
  recoveryState: OrchestrationRecoveryState;
}

export interface OrchestrationResult {
  success: boolean;
  orchestrationId: string;
  orchestrationType: OrchestrationType;
  graphVersion: string;
  previousNode: string | null;
  currentNode: string | null;
  previousVersion: number | null;
  currentVersion: number | null;
  workflowsInvoked: WorkflowType[];
  commandsExecuted: string[];
  queriesExecuted: string[];
  policiesEvaluated: string[];
  businessRulesEvaluated: string[];
  sagaStepsCompleted: string[];
  sagaStepsFailed: string[];
  compensationStatus: "not_required" | "completed" | "partial" | "failed" | "manual_review";
  eventsEmitted: string[];
  scheduledActionsCreated: string[];
  retryState: {
    attempts: number;
    nextRetryAt: string | null;
    exhausted: boolean;
  };
  timeoutState: {
    timeoutAt: string | null;
    expired: boolean;
  };
  recoveryState: OrchestrationRecoveryState;
  humanReviewRequired: boolean;
  blockingReasons: string[];
  requiredNextActions: string[];
  correlationId: string;
  explanation: string;
  errorCategory?: string;
}

export interface OrchestrationVersionConflict {
  code: "version_conflict";
  message: string;
  expectedVersion: number;
  actualVersion: number;
  retryGuidance: string;
}

export function createOrchestrationState(input: {
  identity: OrchestrationIdentity;
  scope: OrchestrationScope;
  status?: OrchestrationStatus;
  currentNodeId: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  nextScheduledActionAt?: string | null;
  timeoutAt?: string | null;
  metadata?: Record<string, unknown>;
}): OrchestrationState {
  const now = new Date().toISOString();
  return {
    identity: input.identity,
    status: input.status ?? "pending",
    currentNodeId: input.currentNodeId,
    scope: input.scope,
    correlationId: input.correlationId,
    causationId: input.causationId ?? null,
    idempotencyKey: input.idempotencyKey,
    expectedVersion: 0,
    orchestrationVersionNumber: 0,
    timing: {
      createdAt: now,
      updatedAt: now,
      nextScheduledActionAt: input.nextScheduledActionAt ?? null,
      timeoutAt: input.timeoutAt ?? null,
    },
    metadata: input.metadata ?? {},
    humanReviewRequired: false,
    lastErrorCategory: null,
    recoveryState: "healthy",
  };
}
