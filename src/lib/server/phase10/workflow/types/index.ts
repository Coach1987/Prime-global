import type { Phase10OrganizationContext } from "../../organization/index.ts";
import type { Phase10DomainEvent } from "../../events/index.ts";
import type { Phase10PolicyDecision } from "../../policy-engine/index.ts";
import type { Phase10BusinessRuleResult } from "../../rule-engine/index.ts";

export type WorkflowType =
  | "candidate_selection"
  | "interview"
  | "offer"
  | "hiring"
  | "payment"
  | "contract"
  | "appeal"
  | "violation";

export type WorkflowStateName = string;

export interface WorkflowActorContext {
  actorId: string;
  role: string;
  authenticated: boolean;
  permissions: string[];
}

export interface WorkflowTenantContext {
  tenantId: string | null;
  tenantName?: string | null;
}

export interface WorkflowOrgContext {
  organizationId: string;
  organizationName: string;
  tenantId: string | null;
  tenantName: string | null;
  isPrimeGlobalDefault: boolean;
}

export interface WorkflowMetadata {
  correlationId: string;
  causationId?: string | null;
  commandId: string;
  idempotencyKey: string;
  submittedAt: string;
}

export interface WorkflowState {
  workflowType: WorkflowType;
  workflowId: string;
  currentState: WorkflowStateName;
  version: number;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface WorkflowTransitionRecord {
  workflowType: WorkflowType;
  workflowId: string;
  fromState: WorkflowStateName;
  toState: WorkflowStateName;
  previousVersion: number;
  nextVersion: number;
  actor: WorkflowActorContext;
  organization: WorkflowOrgContext;
  metadata: Record<string, unknown>;
  explanation: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  reversible: boolean;
  terminal: boolean;
  timestamp: string;
}

export interface WorkflowAuditEntry {
  workflowId: string;
  commandId: string;
  actorId: string;
  actorRole: string;
  organizationId: string;
  tenantId: string | null;
  outcome: "success" | "failure" | "manual_review";
  reason: string;
  timestamp: string;
  redactedMetadata?: Record<string, unknown>;
}

export interface WorkflowEvidenceReference {
  workflowId: string;
  referenceId: string;
  evidenceType: string;
  timestamp: string;
  redactedMetadata: Record<string, unknown>;
}

export interface WorkflowTimelineEvent {
  workflowId: string;
  eventType: string;
  description: string;
  timestamp: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}

export type WorkflowCommandName =
  | "SelectCandidateCommand"
  | "RequestInterviewCommand"
  | "AcceptInterviewInvitationCommand"
  | "AcceptCoordinationTermsCommand"
  | "ActivateInterviewCommand"
  | "StartInterviewCommand"
  | "CompleteInterviewCommand"
  | "RecordHiringDecisionCommand"
  | "ConfirmServiceFeeCommand"
  | "VerifyPaymentCommand"
  | "UnlockContractCommand"
  | "SubmitAppealCommand"
  | "FreezeConversationCommand";

export interface WorkflowCommandEnvelope<TPayload = Record<string, unknown>, TName extends WorkflowCommandName = WorkflowCommandName> {
  commandName: TName;
  commandVersion: string;
  commandId: string;
  idempotencyKey: string;
  correlationId: string;
  causationId: string | null;
  actor: WorkflowActorContext;
  organization: WorkflowOrgContext;
  tenant: WorkflowTenantContext;
  workflowId: string;
  expectedVersion?: number;
  submittedAt: string;
  payload: TPayload;
}

export type SelectCandidateCommand = WorkflowCommandEnvelope<{ candidateId: string }, "SelectCandidateCommand">;
export type RequestInterviewCommand = WorkflowCommandEnvelope<{ interviewId: string }, "RequestInterviewCommand">;
export type AcceptInterviewInvitationCommand = WorkflowCommandEnvelope<{ invitationId: string }, "AcceptInterviewInvitationCommand">;
export type AcceptCoordinationTermsCommand = WorkflowCommandEnvelope<{ termsVersion: string }, "AcceptCoordinationTermsCommand">;
export type ActivateInterviewCommand = WorkflowCommandEnvelope<{ interviewId: string }, "ActivateInterviewCommand">;
export type StartInterviewCommand = WorkflowCommandEnvelope<{ interviewId: string }, "StartInterviewCommand">;
export type CompleteInterviewCommand = WorkflowCommandEnvelope<{ interviewId: string; result: string }, "CompleteInterviewCommand">;
export type RecordHiringDecisionCommand = WorkflowCommandEnvelope<{ decision: "hire" | "reject" }, "RecordHiringDecisionCommand">;
export type ConfirmServiceFeeCommand = WorkflowCommandEnvelope<{ feeReference: string }, "ConfirmServiceFeeCommand">;
export type VerifyPaymentCommand = WorkflowCommandEnvelope<{ paymentReference: string }, "VerifyPaymentCommand">;
export type UnlockContractCommand = WorkflowCommandEnvelope<{ contractId: string }, "UnlockContractCommand">;
export type SubmitAppealCommand = WorkflowCommandEnvelope<{ appealReason: string }, "SubmitAppealCommand">;
export type FreezeConversationCommand = WorkflowCommandEnvelope<{ conversationId: string; reason: string }, "FreezeConversationCommand">;

export type WorkflowQueryName =
  | "GetRecruitmentWorkflowStateQuery"
  | "GetInterviewStateQuery"
  | "GetContractGateStateQuery"
  | "GetViolationStateQuery"
  | "GetAppealStateQuery"
  | "GetTimelineQuery"
  | "GetWorkflowAuditQuery"
  | "GetWorkflowEvidenceSummaryQuery";

export interface WorkflowQuery<TParams = Record<string, unknown>, TResult = unknown, TName extends WorkflowQueryName = WorkflowQueryName> {
  queryName: TName;
  queryVersion: string;
  correlationId: string;
  actor: WorkflowActorContext;
  organization: WorkflowOrgContext;
  tenant: WorkflowTenantContext;
  params: TParams;
  executeReadOnly: (params: TParams) => Promise<TResult>;
}

export interface WorkflowQueryAuthDecision {
  allowed: boolean;
  reason: string;
}

export interface WorkflowExplainableResult {
  success: boolean;
  commandId: string;
  workflowId: string;
  previousState: WorkflowStateName | null;
  currentState: WorkflowStateName | null;
  previousVersion: number | null;
  currentVersion: number | null;
  policiesEvaluated: string[];
  businessRulesEvaluated: string[];
  passedConditions: string[];
  failedConditions: string[];
  blockingReasons: string[];
  requiredNextActions: string[];
  eventsEmitted: string[];
  compensationStatus: "not_required" | "completed" | "partial" | "failed" | "manual_review";
  humanReviewRequired: boolean;
  correlationId: string;
  errorCode?: string;
}

export interface WorkflowExecutionContext {
  actor: WorkflowActorContext;
  organization: WorkflowOrgContext;
  tenant: WorkflowTenantContext;
  policyDecision: Phase10PolicyDecision;
  businessRuleResult: Phase10BusinessRuleResult;
}

export interface WorkflowDomainHandlerResult {
  workflowType: WorkflowType;
  fromState: WorkflowStateName;
  toState: WorkflowStateName;
  explanation: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  transitionMetadata: Record<string, unknown>;
  reversible: boolean;
  terminal: boolean;
  events: Phase10DomainEvent[];
  evidenceReference?: WorkflowEvidenceReference | null;
  timelineEvent?: WorkflowTimelineEvent | null;
}

export interface WorkflowDomainHandler {
  execute: (command: WorkflowCommandEnvelope, currentState: WorkflowState | null, context: WorkflowExecutionContext) => Promise<WorkflowDomainHandlerResult>;
}

export interface WorkflowStateSnapshot {
  state: WorkflowState;
  transitions: WorkflowTransitionRecord[];
  events: Phase10DomainEvent[];
  audit: WorkflowAuditEntry[];
  evidence: WorkflowEvidenceReference[];
  timeline: WorkflowTimelineEvent[];
}

export interface WorkflowPolicyInput {
  actorRole: string;
  action: string;
  organization: Phase10OrganizationContext;
  facts: Record<string, unknown>;
}
