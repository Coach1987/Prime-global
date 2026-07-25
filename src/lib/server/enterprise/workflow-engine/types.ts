export type WorkflowStateName =
  | "draft"
  | "pending"
  | "in_review"
  | "waiting_higher_approval"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled"
  | "expired"
  | "executed"
  | "archived";

export type WorkflowApprovalMode =
  | "single"
  | "sequential"
  | "parallel"
  | "conditional"
  | "owner_final"
  | "authority_level"
  | "financial"
  | "minimum_authority"
  | "ai_advisory";

export type WorkflowParticipantType = "user" | "role" | "group" | "system";
export type WorkflowParticipationMode = "required" | "optional" | "observer" | "approver" | "owner";
export type WorkflowDecisionKind = "approve" | "reject" | "return" | "cancel" | "delegate" | "escalate";
export type WorkflowEscalationKind = "automatic" | "timeout" | "manager" | "owner" | "delegation" | "temporary_reassignment" | "reminder";
export type WorkflowEscalationStatus = "pending" | "scheduled" | "triggered" | "completed" | "cancelled";
export type WorkflowEscalationTargetType = "user" | "role" | "group" | "manager" | "owner" | "delegate" | "system";
export type WorkflowAuditOutcome = "success" | "failure" | "manual_review";
export type WorkflowAuthorType = "user" | "system";
export type WorkflowRuleMatchMode = "all" | "any";
export type WorkflowRuleComparisonOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "greater_or_equal"
  | "less_than"
  | "less_or_equal"
  | "contains"
  | "in"
  | "starts_with"
  | "ends_with";

export interface WorkflowTypeRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRecord {
  id: string;
  workflow_type_id: string;
  code: string;
  name: string;
  description: string | null;
  definition: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStateRecord {
  id: string;
  workflow_type_id: string;
  code: string;
  name: string;
  state_name: WorkflowStateName;
  sort_order: number;
  is_terminal: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTransitionRecord {
  id: string;
  workflow_type_id: string;
  from_state_name: WorkflowStateName;
  to_state_name: WorkflowStateName;
  transition_code: string;
  reversible: boolean;
  terminal: boolean;
  condition: WorkflowRuleExpression | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstanceRecord {
  id: string;
  workflow_id: string;
  workflow_type_id: string;
  code: string;
  external_subject_type: string | null;
  external_subject_id: string | null;
  current_state: WorkflowStateName;
  status: WorkflowStateName;
  version: number;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStageRecord {
  id: string;
  workflow_id: string;
  code: string;
  name: string;
  stage_order: number;
  approval_mode: WorkflowApprovalMode;
  state_name: WorkflowStateName;
  rule_expression: WorkflowRuleExpression | null;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowActionRecord {
  id: string;
  workflow_stage_id: string;
  code: string;
  name: string;
  action_code: string;
  result_state_name: WorkflowStateName | null;
  terminal: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowParticipantRecord {
  id: string;
  workflow_instance_id: string;
  participant_type: WorkflowParticipantType;
  participant_key: string;
  participation_mode: WorkflowParticipationMode;
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDecisionRecord {
  id: string;
  workflow_instance_id: string;
  workflow_stage_id: string | null;
  workflow_action_id: string | null;
  participant_id: string | null;
  decision_kind: WorkflowDecisionKind;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowRuleCondition {
  field: string;
  operator: WorkflowRuleComparisonOperator;
  value: unknown;
  path?: string;
}

export interface WorkflowRuleExpressionGroup {
  match: WorkflowRuleMatchMode;
  conditions: Array<WorkflowRuleExpression>;
}

export type WorkflowRuleExpression = WorkflowRuleCondition | WorkflowRuleExpressionGroup;

export interface WorkflowRuleRecord {
  id: string;
  workflow_type_id: string | null;
  workflow_id: string | null;
  workflow_stage_id: string | null;
  workflow_instance_id: string | null;
  code: string;
  name: string;
  priority: number;
  condition: WorkflowRuleExpression;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEscalationRecord {
  id: string;
  workflow_instance_id: string;
  workflow_stage_id: string | null;
  escalation_kind: WorkflowEscalationKind;
  timeout_minutes: number | null;
  reminder_minutes: number | null;
  target_type: WorkflowEscalationTargetType;
  target_key: string | null;
  status: WorkflowEscalationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowEventRecord {
  id: string;
  workflow_instance_id: string;
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
  immutable: boolean;
  created_at: string;
}

export interface WorkflowHistoryRecord {
  id: string;
  workflow_instance_id: string;
  entry_type: string;
  from_state_name: WorkflowStateName | null;
  to_state_name: WorkflowStateName | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowAttachmentRecord {
  id: string;
  workflow_instance_id: string;
  file_name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number | null;
  checksum: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowCommentRecord {
  id: string;
  workflow_instance_id: string;
  author_type: WorkflowAuthorType;
  author_key: string;
  body: string;
  is_internal: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowAuditRecord {
  id: string;
  workflow_instance_id: string;
  action_code: string;
  actor_type: WorkflowAuthorType;
  actor_key: string;
  outcome: WorkflowAuditOutcome;
  reason: string;
  record_state: Record<string, unknown>;
  created_at: string;
}

export interface WorkflowRuleEvaluationContext {
  facts: Record<string, unknown>;
  amount?: number | null;
  currencyCode?: string | null;
  country?: string | null;
  employeeRole?: string | null;
  authorityLevel?: number | null;
  workflowTypeCode?: string | null;
}

export interface WorkflowRuleEvaluationResult {
  matched: boolean;
  reason: string;
  failedConditions: string[];
}

export interface WorkflowTransitionGuardInput {
  workflowTypeCode: string;
  currentState: WorkflowStateName;
  targetState: WorkflowStateName;
  approvalMode?: WorkflowApprovalMode | null;
  ruleContext: WorkflowRuleEvaluationContext;
}

export interface WorkflowTransitionGuardResult {
  allowed: boolean;
  explanation: string;
  blockingReasons: string[];
  requiredNextActions: string[];
}

export interface WorkflowTransitionDefinition {
  from: WorkflowStateName;
  to: WorkflowStateName;
  reversible: boolean;
  terminal: boolean;
  condition?: WorkflowRuleExpression | null;
}

export interface WorkflowStateMachineDefinition {
  workflowTypeCode: string;
  initialState: WorkflowStateName;
  terminalStates: WorkflowStateName[];
  transitions: WorkflowTransitionDefinition[];
}

export interface WorkflowTransitionRequest {
  workflowTypeCode: string;
  currentState: WorkflowStateName;
  targetState: WorkflowStateName;
  currentVersion?: number;
  expectedVersion?: number;
  approvalMode?: WorkflowApprovalMode | null;
  ruleContext: WorkflowRuleEvaluationContext;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface WorkflowTransitionResult {
  success: boolean;
  workflowTypeCode: string;
  previousState: WorkflowStateName;
  currentState: WorkflowStateName;
  previousVersion: number;
  currentVersion: number;
  explanation: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  reversible: boolean;
  terminal: boolean;
  timestamp: string;
}

export interface WorkflowEventEnvelope {
  workflowInstanceId: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  immutable: boolean;
}
