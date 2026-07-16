export interface Phase10OrganizationContext {
  organizationId: string;
  organizationName: string;
  tenantId: string | null;
  tenantName: string | null;
  isPrimeGlobalDefault: boolean;
}

export interface Phase10TenantScopeInput {
  organizationId?: string;
  organizationName?: string;
  tenantId?: string | null;
  tenantName?: string | null;
}
