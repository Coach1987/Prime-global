import { z } from "zod";

const nameSchema = z.string().trim().min(2).max(180);
const codeSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i);
const descriptionSchema = z.string().trim().max(2000).optional();
const metadataSchema = z.record(z.unknown()).default({});

export const workflowStateNameSchema = z.enum([
  "draft",
  "pending",
  "in_review",
  "waiting_higher_approval",
  "approved",
  "rejected",
  "returned",
  "cancelled",
  "expired",
  "executed",
  "archived",
]);

export const workflowApprovalModeSchema = z.enum([
  "single",
  "sequential",
  "parallel",
  "conditional",
  "owner_final",
  "authority_level",
  "financial",
  "minimum_authority",
  "ai_advisory",
]);

export const workflowParticipantTypeSchema = z.enum(["user", "role", "group", "system"]);
export const workflowParticipationModeSchema = z.enum(["required", "optional", "observer", "approver", "owner"]);
export const workflowDecisionKindSchema = z.enum(["approve", "reject", "return", "cancel", "delegate", "escalate"]);
export const workflowEscalationKindSchema = z.enum([
  "automatic",
  "timeout",
  "manager",
  "owner",
  "delegation",
  "temporary_reassignment",
  "reminder",
]);
export const workflowEscalationStatusSchema = z.enum(["pending", "scheduled", "triggered", "completed", "cancelled"]);
export const workflowEscalationTargetTypeSchema = z.enum(["user", "role", "group", "manager", "owner", "delegate", "system"]);
export const workflowAuditOutcomeSchema = z.enum(["success", "failure", "manual_review"]);
export const workflowAuthorTypeSchema = z.enum(["user", "system"]);

const workflowRuleConditionSchema = z.object({
  field: codeSchema,
  operator: z.enum([
    "equals",
    "not_equals",
    "greater_than",
    "greater_or_equal",
    "less_than",
    "less_or_equal",
    "contains",
    "in",
    "starts_with",
    "ends_with",
  ]),
  value: z.unknown(),
  path: z.string().trim().max(120).optional(),
});

export const workflowRuleExpressionSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    workflowRuleConditionSchema,
    z.object({
      match: z.enum(["all", "any"]),
      conditions: z.array(workflowRuleExpressionSchema).min(1),
    }),
  ])
);

export const createWorkflowTypeSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
  isActive: z.boolean().default(true),
});

export const createWorkflowSchema = z.object({
  workflowTypeId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  description: descriptionSchema,
  definition: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createWorkflowStateSchema = z.object({
  workflowTypeId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  stateName: workflowStateNameSchema,
  sortOrder: z.number().int().min(0).default(0),
  isTerminal: z.boolean().default(false),
});

export const createWorkflowTransitionSchema = z.object({
  workflowTypeId: z.string().uuid(),
  fromStateName: workflowStateNameSchema,
  toStateName: workflowStateNameSchema,
  transitionCode: codeSchema,
  reversible: z.boolean().default(false),
  terminal: z.boolean().default(false),
  condition: workflowRuleExpressionSchema.optional(),
});

export const workflowTransitionSnapshotSchema = z.object({
  fromStateName: workflowStateNameSchema,
  toStateName: workflowStateNameSchema,
  reversible: z.boolean().default(false),
  terminal: z.boolean().default(false),
  condition: workflowRuleExpressionSchema.optional(),
});

export const createWorkflowInstanceSchema = z.object({
  workflowId: z.string().uuid(),
  workflowTypeId: z.string().uuid(),
  code: codeSchema,
  externalSubjectType: z.string().trim().max(120).optional(),
  externalSubjectId: z.string().trim().max(160).optional(),
  currentState: workflowStateNameSchema.default("draft"),
  status: workflowStateNameSchema.default("draft"),
  context: metadataSchema,
});

export const createWorkflowStageSchema = z.object({
  workflowId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  stageOrder: z.number().int().min(0).default(0),
  approvalMode: workflowApprovalModeSchema,
  stateName: workflowStateNameSchema,
  ruleExpression: workflowRuleExpressionSchema.optional(),
  isRequired: z.boolean().default(true),
});

export const createWorkflowActionSchema = z.object({
  workflowStageId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  actionCode: codeSchema,
  resultStateName: workflowStateNameSchema.optional(),
  terminal: z.boolean().default(false),
});

export const createWorkflowParticipantSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  participantType: workflowParticipantTypeSchema,
  participantKey: z.string().trim().min(1).max(160),
  participationMode: workflowParticipationModeSchema,
  isRequired: z.boolean().default(false),
});

export const createWorkflowDecisionSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  workflowStageId: z.string().uuid().optional(),
  workflowActionId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
  decisionKind: workflowDecisionKindSchema,
  notes: z.string().trim().max(2000).optional(),
  metadata: metadataSchema,
});

export const createWorkflowRuleSchema = z.object({
  workflowTypeId: z.string().uuid().optional(),
  workflowId: z.string().uuid().optional(),
  workflowStageId: z.string().uuid().optional(),
  workflowInstanceId: z.string().uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  priority: z.number().int().min(0).default(100),
  condition: workflowRuleExpressionSchema,
  isActive: z.boolean().default(true),
});

export const createWorkflowEscalationSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  workflowStageId: z.string().uuid().optional(),
  escalationKind: workflowEscalationKindSchema,
  timeoutMinutes: z.number().int().positive().optional(),
  reminderMinutes: z.number().int().positive().optional(),
  targetType: workflowEscalationTargetTypeSchema,
  targetKey: z.string().trim().min(1).max(160).optional(),
  status: workflowEscalationStatusSchema.default("pending"),
  notes: z.string().trim().max(2000).optional(),
});

export const createWorkflowEventSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  eventType: codeSchema,
  occurredAt: z.string().datetime().optional(),
  payload: metadataSchema,
});

export const createWorkflowHistorySchema = z.object({
  workflowInstanceId: z.string().uuid(),
  entryType: codeSchema,
  fromStateName: workflowStateNameSchema.optional(),
  toStateName: workflowStateNameSchema.optional(),
  description: z.string().trim().max(2000),
  metadata: metadataSchema,
});

export const createWorkflowAttachmentSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255),
  storageKey: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(2).max(120),
  sizeBytes: z.number().int().nonnegative().optional(),
  checksum: z.string().trim().max(128).optional(),
  metadata: metadataSchema,
});

export const createWorkflowCommentSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  authorType: workflowAuthorTypeSchema,
  authorKey: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(5000),
  isInternal: z.boolean().default(false),
  metadata: metadataSchema,
});

export const createWorkflowAuditSchema = z.object({
  workflowInstanceId: z.string().uuid(),
  actionCode: codeSchema,
  actorType: workflowAuthorTypeSchema,
  actorKey: z.string().trim().min(1).max(160),
  outcome: workflowAuditOutcomeSchema,
  reason: z.string().trim().min(1).max(2000),
  recordState: metadataSchema,
});

export const evaluateWorkflowInstanceSchema = z.object({
  workflowTypeCode: codeSchema,
  currentState: workflowStateNameSchema,
  targetState: workflowStateNameSchema,
  approvalMode: workflowApprovalModeSchema.optional(),
  currentVersion: z.number().int().min(0).default(0),
  expectedVersion: z.number().int().min(0).optional(),
  amount: z.number().nonnegative().optional(),
  currencyCode: z.string().trim().min(3).max(10).optional(),
  country: z.string().trim().min(2).max(120).optional(),
  employeeRole: z.string().trim().min(1).max(160).optional(),
  authorityLevel: z.number().int().min(0).max(1000).optional(),
  facts: metadataSchema,
  transitions: z.array(workflowTransitionSnapshotSchema).min(1),
  terminalStates: z.array(workflowStateNameSchema).default([]),
});

export const listByWorkflowTypeQuerySchema = z.object({
  workflowTypeId: z.string().uuid(),
});

export const listByWorkflowQuerySchema = z.object({
  workflowId: z.string().uuid(),
});

export const listByWorkflowInstanceQuerySchema = z.object({
  workflowInstanceId: z.string().uuid(),
});
