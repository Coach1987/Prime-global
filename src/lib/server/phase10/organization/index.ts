import type { Phase10OrganizationContext, Phase10TenantScopeInput } from "./types.ts";

export const PRIME_GLOBAL_ORGANIZATION_ID = "prime-global";
export const PRIME_GLOBAL_ORGANIZATION_NAME = "Prime Global";

export function createPhase10OrganizationContext(input: Phase10TenantScopeInput = {}): Phase10OrganizationContext {
  const organizationId = input.organizationId?.trim() || PRIME_GLOBAL_ORGANIZATION_ID;
  const organizationName = input.organizationName?.trim() || PRIME_GLOBAL_ORGANIZATION_NAME;
  const tenantId = input.tenantId?.trim() || null;
  const tenantName = input.tenantName?.trim() || null;

  return {
    organizationId,
    organizationName,
    tenantId,
    tenantName,
    isPrimeGlobalDefault: organizationId === PRIME_GLOBAL_ORGANIZATION_ID && tenantId === null,
  };
}

export function isPrimeGlobalDefaultOrganization(context: Phase10OrganizationContext) {
  return context.isPrimeGlobalDefault;
}

export function requireTenantScope(context: Phase10OrganizationContext) {
  return {
    allowed: Boolean(context.organizationId),
    explanation: context.tenantId ? "Tenant-scoped context resolved." : "Default Prime Global organization context resolved.",
    organizationId: context.organizationId,
    tenantId: context.tenantId,
  };
}

export type { Phase10OrganizationContext, Phase10TenantScopeInput } from "./types.ts";
