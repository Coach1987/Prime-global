import type {
  WorkflowCommandEnvelope,
  WorkflowCommandName,
  WorkflowOrgContext,
  WorkflowTenantContext,
  WorkflowActorContext,
} from "../types/index.ts";

export interface WorkflowCommandDefinition<TPayload = Record<string, unknown>> {
  commandName: WorkflowCommandName;
  version: string;
  validatePayload: (payload: unknown) => payload is TPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasString(input: Record<string, unknown>, key: string): boolean {
  return typeof input[key] === "string" && input[key].trim().length > 0;
}

export const workflowCommandDefinitions: WorkflowCommandDefinition[] = [
  { commandName: "SelectCandidateCommand", version: "1.0.0", validatePayload: (payload): payload is { candidateId: string } => isRecord(payload) && hasString(payload, "candidateId") },
  { commandName: "RequestInterviewCommand", version: "1.0.0", validatePayload: (payload): payload is { interviewId: string } => isRecord(payload) && hasString(payload, "interviewId") },
  { commandName: "AcceptInterviewInvitationCommand", version: "1.0.0", validatePayload: (payload): payload is { invitationId: string } => isRecord(payload) && hasString(payload, "invitationId") },
  { commandName: "AcceptCoordinationTermsCommand", version: "1.0.0", validatePayload: (payload): payload is { termsVersion: string } => isRecord(payload) && hasString(payload, "termsVersion") },
  { commandName: "ActivateInterviewCommand", version: "1.0.0", validatePayload: (payload): payload is { interviewId: string } => isRecord(payload) && hasString(payload, "interviewId") },
  { commandName: "StartInterviewCommand", version: "1.0.0", validatePayload: (payload): payload is { interviewId: string } => isRecord(payload) && hasString(payload, "interviewId") },
  { commandName: "CompleteInterviewCommand", version: "1.0.0", validatePayload: (payload): payload is { interviewId: string; result: string } => isRecord(payload) && hasString(payload, "interviewId") && hasString(payload, "result") },
  { commandName: "RecordHiringDecisionCommand", version: "1.0.0", validatePayload: (payload): payload is { decision: string } => isRecord(payload) && hasString(payload, "decision") },
  { commandName: "ConfirmServiceFeeCommand", version: "1.0.0", validatePayload: (payload): payload is { feeReference: string } => isRecord(payload) && hasString(payload, "feeReference") },
  { commandName: "VerifyPaymentCommand", version: "1.0.0", validatePayload: (payload): payload is { paymentReference: string } => isRecord(payload) && hasString(payload, "paymentReference") },
  { commandName: "UnlockContractCommand", version: "1.0.0", validatePayload: (payload): payload is { contractId: string } => isRecord(payload) && hasString(payload, "contractId") },
  { commandName: "SubmitAppealCommand", version: "1.0.0", validatePayload: (payload): payload is { appealReason: string } => isRecord(payload) && hasString(payload, "appealReason") },
  { commandName: "FreezeConversationCommand", version: "1.0.0", validatePayload: (payload): payload is { conversationId: string; reason: string } => isRecord(payload) && hasString(payload, "conversationId") && hasString(payload, "reason") },
];

export interface WorkflowCommandValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidActor(actor: WorkflowActorContext): boolean {
  return actor.authenticated && actor.actorId.trim().length > 0 && actor.role.trim().length > 0;
}

function isValidOrganization(organization: WorkflowOrgContext): boolean {
  return organization.organizationId.trim().length > 0;
}

function isValidTenant(tenant: WorkflowTenantContext): boolean {
  return tenant.tenantId === null || tenant.tenantId.trim().length > 0;
}

export function validateWorkflowCommandEnvelope(command: WorkflowCommandEnvelope): WorkflowCommandValidationResult {
  const errors: string[] = [];
  const definition = workflowCommandDefinitions.find((entry) => entry.commandName === command.commandName);

  if (!definition) {
    errors.push(`Unknown command: ${command.commandName}`);
  } else if (!definition.validatePayload(command.payload)) {
    errors.push(`Payload is invalid for command ${command.commandName}`);
  }

  if (!command.commandVersion?.trim()) errors.push("commandVersion is required");
  if (!command.commandId?.trim()) errors.push("commandId is required");
  if (!command.idempotencyKey?.trim()) errors.push("idempotencyKey is required");
  if (!command.correlationId?.trim()) errors.push("correlationId is required");
  if (!command.workflowId?.trim()) errors.push("workflowId is required");
  if (!command.submittedAt?.trim()) errors.push("submittedAt is required");
  if (!isValidActor(command.actor)) errors.push("actor context is invalid");
  if (!isValidOrganization(command.organization)) errors.push("organization context is invalid");
  if (!isValidTenant(command.tenant)) errors.push("tenant context is invalid");

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createWorkflowCommandFoundation<TPayload>(input: {
  commandName: WorkflowCommandName;
  commandVersion: string;
  commandId: string;
  idempotencyKey: string;
  correlationId: string;
  causationId?: string | null;
  actor: WorkflowActorContext;
  organization: WorkflowOrgContext;
  tenant: WorkflowTenantContext;
  workflowId: string;
  expectedVersion?: number;
  submittedAt?: string;
  payload: TPayload;
}): WorkflowCommandEnvelope<TPayload> {
  return {
    commandName: input.commandName,
    commandVersion: input.commandVersion,
    commandId: input.commandId,
    idempotencyKey: input.idempotencyKey,
    correlationId: input.correlationId,
    causationId: input.causationId ?? null,
    actor: input.actor,
    organization: input.organization,
    tenant: input.tenant,
    workflowId: input.workflowId,
    expectedVersion: input.expectedVersion,
    submittedAt: input.submittedAt ?? new Date().toISOString(),
    payload: input.payload,
  };
}
