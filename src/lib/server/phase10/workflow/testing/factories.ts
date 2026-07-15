import { randomUUID } from "node:crypto";
import { createPhase10OrganizationContext } from "../../organization/index.ts";
import type { WorkflowActorContext, WorkflowCommandEnvelope, WorkflowOrgContext, WorkflowTenantContext } from "../types/index.ts";

export function createWorkflowActor(overrides?: Partial<WorkflowActorContext>): WorkflowActorContext {
  return {
    actorId: overrides?.actorId ?? randomUUID(),
    role: overrides?.role ?? "prime_global_recruiter",
    authenticated: overrides?.authenticated ?? true,
    permissions: overrides?.permissions ?? ["org:prime-global"],
  };
}

export function createWorkflowOrganization(overrides?: Partial<WorkflowOrgContext>): WorkflowOrgContext {
  const context = createPhase10OrganizationContext({ organizationId: "prime-global", organizationName: "Prime Global" });
  return {
    organizationId: overrides?.organizationId ?? context.organizationId,
    organizationName: overrides?.organizationName ?? context.organizationName,
    tenantId: overrides?.tenantId ?? context.tenantId,
    tenantName: overrides?.tenantName ?? context.tenantName,
    isPrimeGlobalDefault: overrides?.isPrimeGlobalDefault ?? context.isPrimeGlobalDefault,
  };
}

export function createWorkflowTenant(overrides?: Partial<WorkflowTenantContext>): WorkflowTenantContext {
  return {
    tenantId: overrides?.tenantId ?? null,
    tenantName: overrides?.tenantName ?? null,
  };
}

export function createWorkflowCommand(overrides?: Partial<WorkflowCommandEnvelope>): WorkflowCommandEnvelope {
  const actor = overrides?.actor ?? createWorkflowActor();
  const organization = overrides?.organization ?? createWorkflowOrganization();
  const tenant = overrides?.tenant ?? createWorkflowTenant();

  return {
    commandName: overrides?.commandName ?? "AcceptInterviewInvitationCommand",
    commandVersion: overrides?.commandVersion ?? "1.0.0",
    commandId: overrides?.commandId ?? randomUUID(),
    idempotencyKey: overrides?.idempotencyKey ?? `idem:${randomUUID()}`,
    correlationId: overrides?.correlationId ?? `corr:${randomUUID()}`,
    causationId: overrides?.causationId ?? null,
    actor,
    organization,
    tenant,
    workflowId: overrides?.workflowId ?? `wf:${randomUUID()}`,
    expectedVersion: overrides?.expectedVersion,
    submittedAt: overrides?.submittedAt ?? new Date().toISOString(),
    payload: overrides?.payload ?? { invitationId: randomUUID() },
  };
}
