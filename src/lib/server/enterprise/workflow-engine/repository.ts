import { createSupabaseAdminClient } from "../../supabase.ts";
import { createWorkflowAuditEntry, createWorkflowEventEnvelope, createWorkflowHistoryEntry } from "./audit.ts";
import { evaluateWorkflowTransition } from "./state-machine.ts";
import type {
  WorkflowApprovalMode,
  WorkflowAuditRecord,
  WorkflowCommentRecord,
  WorkflowDecisionKind,
  WorkflowDecisionRecord,
  WorkflowEscalationKind,
  WorkflowEscalationRecord,
  WorkflowEventRecord,
  WorkflowHistoryRecord,
  WorkflowInstanceRecord,
  WorkflowParticipantRecord,
  WorkflowRecord,
  WorkflowRuleEvaluationContext,
  WorkflowRuleExpression,
  WorkflowRuleRecord,
  WorkflowStageRecord,
  WorkflowStateMachineDefinition,
  WorkflowStateName,
  WorkflowStateRecord,
  WorkflowTransitionDefinition,
  WorkflowTypeRecord,
  WorkflowAttachmentRecord,
  WorkflowActionRecord,
} from "./types.ts";

async function listRows<T>(table: string, select = "*") {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).select(select).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as T[];
}

async function createRow<T>(table: string, payload: Record<string, unknown>, select = "*") {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).insert(payload).select(select).single();
  if (error) throw error;
  return data as T;
}

export async function listWorkflowTypes() {
  return listRows<WorkflowTypeRecord>("pgems_workflow_types");
}

export async function createWorkflowType(payload: { code: string; name: string; description?: string | null; isActive: boolean }) {
  return createRow<WorkflowTypeRecord>("pgems_workflow_types", {
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    is_active: payload.isActive,
  });
}

export async function listWorkflowDefinitions(workflowTypeId?: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase.from("pgems_workflows").select("*").order("created_at", { ascending: true });
  const { data, error } = workflowTypeId ? await query.eq("workflow_type_id", workflowTypeId) : await query;
  if (error) throw error;
  return (data ?? []) as WorkflowRecord[];
}

export async function createWorkflowDefinition(payload: { workflowTypeId: string; code: string; name: string; description?: string | null; definition: Record<string, unknown>; isActive: boolean }) {
  return createRow<WorkflowRecord>("pgems_workflows", {
    workflow_type_id: payload.workflowTypeId,
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    definition: payload.definition,
    is_active: payload.isActive,
  });
}

export async function listWorkflowStates(workflowTypeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("pgems_workflow_state_definitions").select("*").eq("workflow_type_id", workflowTypeId).order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowStateRecord[];
}

export async function createWorkflowState(payload: { workflowTypeId: string; code: string; name: string; stateName: WorkflowStateName; sortOrder: number; isTerminal: boolean }) {
  return createRow<WorkflowStateRecord>("pgems_workflow_state_definitions", {
    workflow_type_id: payload.workflowTypeId,
    code: payload.code,
    name: payload.name,
    state_name: payload.stateName,
    sort_order: payload.sortOrder,
    is_terminal: payload.isTerminal,
  });
}

export async function listWorkflowTransitions(workflowTypeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("pgems_workflow_transition_definitions").select("*").eq("workflow_type_id", workflowTypeId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowTransitionDefinition[];
}

export async function createWorkflowTransition(payload: { workflowTypeId: string; fromStateName: WorkflowStateName; toStateName: WorkflowStateName; transitionCode: string; reversible: boolean; terminal: boolean; condition?: WorkflowRuleExpression | null }) {
  return createRow<WorkflowTransitionDefinition>("pgems_workflow_transition_definitions", {
    workflow_type_id: payload.workflowTypeId,
    from_state_name: payload.fromStateName,
    to_state_name: payload.toStateName,
    transition_code: payload.transitionCode,
    reversible: payload.reversible,
    terminal: payload.terminal,
    condition: payload.condition ?? null,
  });
}

export async function listWorkflowInstances(workflowId?: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase.from("pgems_workflow_instances").select("*").order("created_at", { ascending: true });
  const { data, error } = workflowId ? await query.eq("workflow_id", workflowId) : await query;
  if (error) throw error;
  return (data ?? []) as WorkflowInstanceRecord[];
}

export async function createWorkflowInstance(payload: {
  workflowId: string;
  workflowTypeId: string;
  code: string;
  externalSubjectType?: string | null;
  externalSubjectId?: string | null;
  currentState: WorkflowStateName;
  status: WorkflowStateName;
  context: Record<string, unknown>;
}) {
  return createRow<WorkflowInstanceRecord>("pgems_workflow_instances", {
    workflow_id: payload.workflowId,
    workflow_type_id: payload.workflowTypeId,
    code: payload.code,
    external_subject_type: payload.externalSubjectType ?? null,
    external_subject_id: payload.externalSubjectId ?? null,
    current_state: payload.currentState,
    status: payload.status,
    context: payload.context,
  });
}

export async function listWorkflowStages(workflowId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("pgems_workflow_stages").select("*").eq("workflow_id", workflowId).order("stage_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowStageRecord[];
}

export async function createWorkflowStage(payload: { workflowId: string; code: string; name: string; stageOrder: number; approvalMode: WorkflowApprovalMode; stateName: WorkflowStateName; ruleExpression?: WorkflowRuleExpression | null; isRequired: boolean }) {
  return createRow<WorkflowStageRecord>("pgems_workflow_stages", {
    workflow_id: payload.workflowId,
    code: payload.code,
    name: payload.name,
    stage_order: payload.stageOrder,
    approval_mode: payload.approvalMode,
    state_name: payload.stateName,
    rule_expression: payload.ruleExpression ?? null,
    is_required: payload.isRequired,
  });
}

export async function listWorkflowActions(workflowStageId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("pgems_workflow_actions").select("*").eq("workflow_stage_id", workflowStageId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowActionRecord[];
}

export async function createWorkflowAction(payload: { workflowStageId: string; code: string; name: string; actionCode: string; resultStateName?: WorkflowStateName | null; terminal: boolean }) {
  return createRow<WorkflowActionRecord>("pgems_workflow_actions", {
    workflow_stage_id: payload.workflowStageId,
    code: payload.code,
    name: payload.name,
    action_code: payload.actionCode,
    result_state_name: payload.resultStateName ?? null,
    terminal: payload.terminal,
  });
}

export async function listWorkflowParticipants(workflowInstanceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("pgems_workflow_participants").select("*").eq("workflow_instance_id", workflowInstanceId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowParticipantRecord[];
}

export async function createWorkflowParticipant(payload: { workflowInstanceId: string; participantType: WorkflowParticipantRecord["participant_type"]; participantKey: string; participationMode: WorkflowParticipantRecord["participation_mode"]; isRequired: boolean }) {
  return createRow<WorkflowParticipantRecord>("pgems_workflow_participants", {
    workflow_instance_id: payload.workflowInstanceId,
    participant_type: payload.participantType,
    participant_key: payload.participantKey,
    participation_mode: payload.participationMode,
    is_required: payload.isRequired,
  });
}

export async function listWorkflowDecisions(workflowInstanceId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("pgems_workflow_decisions").select("*").eq("workflow_instance_id", workflowInstanceId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowDecisionRecord[];
}

export async function createWorkflowDecision(payload: {
  workflowInstanceId: string;
  workflowStageId?: string;
  workflowActionId?: string;
  participantId?: string;
  decisionKind: WorkflowDecisionKind;
  notes?: string | null;
  metadata: Record<string, unknown>;
}) {
  return createRow<WorkflowDecisionRecord>("pgems_workflow_decisions", {
    workflow_instance_id: payload.workflowInstanceId,
    workflow_stage_id: payload.workflowStageId ?? null,
    workflow_action_id: payload.workflowActionId ?? null,
    participant_id: payload.participantId ?? null,
    decision_kind: payload.decisionKind,
    notes: payload.notes ?? null,
    metadata: payload.metadata,
  });
}

export async function listWorkflowRules(workflowInstanceId?: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase.from("pgems_workflow_rules").select("*").order("priority", { ascending: true });
  const { data, error } = workflowInstanceId ? await query.eq("workflow_instance_id", workflowInstanceId) : await query;
  if (error) throw error;
  return (data ?? []) as WorkflowRuleRecord[];
}

export async function createWorkflowRule(payload: { workflowTypeId?: string; workflowId?: string; workflowStageId?: string; workflowInstanceId?: string; code: string; name: string; priority: number; condition: WorkflowRuleExpression; isActive: boolean }) {
  return createRow<WorkflowRuleRecord>("pgems_workflow_rules", {
    workflow_type_id: payload.workflowTypeId ?? null,
    workflow_id: payload.workflowId ?? null,
    workflow_stage_id: payload.workflowStageId ?? null,
    workflow_instance_id: payload.workflowInstanceId ?? null,
    code: payload.code,
    name: payload.name,
    priority: payload.priority,
    condition: payload.condition,
    is_active: payload.isActive,
  });
}

export async function listWorkflowEscalations(workflowInstanceId?: string) {
  const supabase = createSupabaseAdminClient();
  const query = supabase.from("pgems_workflow_escalations").select("*").order("created_at", { ascending: true });
  const { data, error } = workflowInstanceId ? await query.eq("workflow_instance_id", workflowInstanceId) : await query;
  if (error) throw error;
  return (data ?? []) as WorkflowEscalationRecord[];
}

export async function createWorkflowEscalation(payload: {
  workflowInstanceId: string;
  workflowStageId?: string;
  escalationKind: WorkflowEscalationKind;
  timeoutMinutes?: number | null;
  reminderMinutes?: number | null;
  targetType: string;
  targetKey?: string | null;
  status: string;
  notes?: string | null;
}) {
  return createRow<WorkflowEscalationRecord>("pgems_workflow_escalations", {
    workflow_instance_id: payload.workflowInstanceId,
    workflow_stage_id: payload.workflowStageId ?? null,
    escalation_kind: payload.escalationKind,
    timeout_minutes: payload.timeoutMinutes ?? null,
    reminder_minutes: payload.reminderMinutes ?? null,
    target_type: payload.targetType,
    target_key: payload.targetKey ?? null,
    status: payload.status,
    notes: payload.notes ?? null,
  });
}

export async function listWorkflowEvents(workflowInstanceId?: string) {
  const rows = await listRows<WorkflowEventRecord>("pgems_workflow_events");
  return workflowInstanceId ? rows.filter((row) => row.workflow_instance_id === workflowInstanceId) : rows;
}

export async function appendWorkflowEvent(payload: { workflowInstanceId: string; eventType: string; payload: Record<string, unknown>; occurredAt?: string }) {
  const record = createWorkflowEventEnvelope({
    workflowInstanceId: payload.workflowInstanceId,
    eventType: payload.eventType,
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    payload: payload.payload,
    immutable: true,
  });

  return createRow<WorkflowEventRecord>("pgems_workflow_events", {
    workflow_instance_id: record.workflowInstanceId,
    event_type: record.eventType,
    occurred_at: record.occurredAt,
    payload: record.payload,
    immutable: record.immutable,
  });
}

export async function listWorkflowHistory(workflowInstanceId?: string) {
  const rows = await listRows<WorkflowHistoryRecord>("pgems_workflow_history");
  return workflowInstanceId ? rows.filter((row) => row.workflow_instance_id === workflowInstanceId) : rows;
}

export async function appendWorkflowHistory(payload: { workflowInstanceId: string; entryType: string; fromStateName?: WorkflowStateName | null; toStateName?: WorkflowStateName | null; description: string; metadata?: Record<string, unknown>; timestamp?: string }) {
  const record = createWorkflowHistoryEntry({
    workflowInstanceId: payload.workflowInstanceId,
    entryType: payload.entryType,
    fromStateName: payload.fromStateName,
    toStateName: payload.toStateName,
    description: payload.description,
    metadata: payload.metadata,
    timestamp: payload.timestamp,
  });

  return createRow<WorkflowHistoryRecord>("pgems_workflow_history", {
    workflow_instance_id: record.workflowInstanceId,
    entry_type: record.entryType,
    from_state_name: record.fromStateName,
    to_state_name: record.toStateName,
    description: record.description,
    metadata: record.metadata,
    created_at: record.createdAt,
  });
}

export async function listWorkflowAttachments(workflowInstanceId?: string) {
  const rows = await listRows<WorkflowAttachmentRecord>("pgems_workflow_attachments");
  return workflowInstanceId ? rows.filter((row) => row.workflow_instance_id === workflowInstanceId) : rows;
}

export async function createWorkflowAttachment(payload: { workflowInstanceId: string; fileName: string; storageKey: string; mimeType: string; sizeBytes?: number | null; checksum?: string | null; metadata: Record<string, unknown> }) {
  return createRow<WorkflowAttachmentRecord>("pgems_workflow_attachments", {
    workflow_instance_id: payload.workflowInstanceId,
    file_name: payload.fileName,
    storage_key: payload.storageKey,
    mime_type: payload.mimeType,
    size_bytes: payload.sizeBytes ?? null,
    checksum: payload.checksum ?? null,
    metadata: payload.metadata,
  });
}

export async function listWorkflowComments(workflowInstanceId?: string) {
  const rows = await listRows<WorkflowCommentRecord>("pgems_workflow_comments");
  return workflowInstanceId ? rows.filter((row) => row.workflow_instance_id === workflowInstanceId) : rows;
}

export async function createWorkflowComment(payload: { workflowInstanceId: string; authorType: WorkflowCommentRecord["author_type"]; authorKey: string; body: string; isInternal: boolean; metadata: Record<string, unknown> }) {
  return createRow<WorkflowCommentRecord>("pgems_workflow_comments", {
    workflow_instance_id: payload.workflowInstanceId,
    author_type: payload.authorType,
    author_key: payload.authorKey,
    body: payload.body,
    is_internal: payload.isInternal,
    metadata: payload.metadata,
  });
}

export async function listWorkflowAudits(workflowInstanceId?: string) {
  const rows = await listRows<WorkflowAuditRecord>("pgems_workflow_audit");
  return workflowInstanceId ? rows.filter((row) => row.workflow_instance_id === workflowInstanceId) : rows;
}

export async function appendWorkflowAudit(payload: { workflowInstanceId: string; actionCode: string; actorType: WorkflowAuditRecord["actor_type"]; actorKey: string; outcome: WorkflowAuditRecord["outcome"]; reason: string; recordState: Record<string, unknown> }) {
  const record = createWorkflowAuditEntry({
    workflowInstanceId: payload.workflowInstanceId,
    actionCode: payload.actionCode,
    actorType: payload.actorType,
    actorKey: payload.actorKey,
    outcome: payload.outcome,
    reason: payload.reason,
    recordState: payload.recordState,
  });

  return createRow<WorkflowAuditRecord>("pgems_workflow_audit", {
    workflow_instance_id: record.workflowInstanceId,
    action_code: record.actionCode,
    actor_type: record.actorType,
    actor_key: record.actorKey,
    outcome: record.outcome,
    reason: record.reason,
    record_state: record.recordState,
    created_at: record.createdAt,
  });
}

export async function evaluateWorkflowInstance(input: {
  workflowTypeCode: string;
  currentState: WorkflowStateName;
  targetState: WorkflowStateName;
  approvalMode?: WorkflowApprovalMode | null;
  ruleContext: WorkflowRuleEvaluationContext;
  transitions: WorkflowTransitionDefinition[];
  terminalStates?: WorkflowStateName[];
  currentVersion?: number;
  expectedVersion?: number;
  timestamp?: string;
}) {
  const definition: WorkflowStateMachineDefinition = {
    workflowTypeCode: input.workflowTypeCode,
    initialState: input.currentState,
    terminalStates: input.terminalStates ?? [],
    transitions: input.transitions,
  };

  return evaluateWorkflowTransition(definition, {
    workflowTypeCode: input.workflowTypeCode,
    currentState: input.currentState,
    targetState: input.targetState,
    currentVersion: input.currentVersion,
    expectedVersion: input.expectedVersion,
    approvalMode: input.approvalMode,
    ruleContext: input.ruleContext,
    timestamp: input.timestamp,
  });
}
