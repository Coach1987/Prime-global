import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { resolveAuthorityLevelValue } from "./authority";
import { evaluateEnterpriseGovernance } from "./governance";
import { loadEmployeePermissionContext } from "./repository";

export async function listAuthorityLevels(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_authority_levels")
    .select("id, organization_id, name, code, level_value, created_at")
    .eq("organization_id", organizationId)
    .order("level_value", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAuthorityLevel(payload: {
  organizationId: string;
  name: string;
  code: string;
  levelValue: number;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_authority_levels")
    .insert({
      organization_id: payload.organizationId,
      name: payload.name,
      code: payload.code,
      level_value: payload.levelValue,
    })
    .select("id, organization_id, name, code, level_value, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function getEmployeeAuthority(employeeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employee_authorities")
    .select("employee_id, authority_level_id, custom_level_value, pgems_authority_levels(level_value, code, name)")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertEmployeeAuthority(payload: {
  employeeId: string;
  authorityLevelId: string;
  customLevelValue?: number;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employee_authorities")
    .upsert(
      {
        employee_id: payload.employeeId,
        authority_level_id: payload.authorityLevelId,
        custom_level_value: payload.customLevelValue ?? null,
      },
      { onConflict: "employee_id" }
    )
    .select("employee_id, authority_level_id, custom_level_value")
    .single();

  if (error) throw error;
  return data;
}

export async function listApprovalOperations() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_approval_operations")
    .select("id, code, name, description, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createApprovalOperation(payload: {
  code: string;
  name: string;
  description?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_approval_operations")
    .insert({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
    })
    .select("id, code, name, description, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listApprovalPolicies(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_approval_policies")
    .select("id, organization_id, operation_id, min_authority_level, required_permission_id, scope_required, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createApprovalPolicy(payload: {
  organizationId: string;
  operationId: string;
  minAuthorityLevel: number;
  requiredPermissionId?: string;
  scopeRequired: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_approval_policies")
    .insert({
      organization_id: payload.organizationId,
      operation_id: payload.operationId,
      min_authority_level: payload.minAuthorityLevel,
      required_permission_id: payload.requiredPermissionId ?? null,
      scope_required: payload.scopeRequired,
    })
    .select("id, organization_id, operation_id, min_authority_level, required_permission_id, scope_required, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function getEmployeeMonetaryAuthority(employeeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employee_monetary_authorities")
    .select("employee_id, currency_code, maximum_approval_amount, is_unlimited, created_at")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertEmployeeMonetaryAuthority(payload: {
  employeeId: string;
  currencyCode: string;
  maximumApprovalAmount?: number;
  isUnlimited: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employee_monetary_authorities")
    .upsert(
      {
        employee_id: payload.employeeId,
        currency_code: payload.currencyCode,
        maximum_approval_amount: payload.maximumApprovalAmount ?? null,
        is_unlimited: payload.isUnlimited,
      },
      { onConflict: "employee_id" }
    )
    .select("employee_id, currency_code, maximum_approval_amount, is_unlimited, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listScopeDimensions() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_scope_dimensions")
    .select("id, code, name, description, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createScopeDimension(payload: {
  code: string;
  name: string;
  description?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_scope_dimensions")
    .insert({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
    })
    .select("id, code, name, description, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listScopeNodes(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_scope_nodes")
    .select("id, organization_id, dimension_id, code, name, parent_scope_node_id, metadata, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createScopeNode(payload: {
  organizationId: string;
  dimensionId: string;
  code: string;
  name: string;
  parentScopeNodeId?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_scope_nodes")
    .insert({
      organization_id: payload.organizationId,
      dimension_id: payload.dimensionId,
      code: payload.code,
      name: payload.name,
      parent_scope_node_id: payload.parentScopeNodeId ?? null,
      metadata: payload.metadata ?? {},
    })
    .select("id, organization_id, dimension_id, code, name, parent_scope_node_id, metadata, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listEmployeeScopes(employeeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employee_scope_assignments")
    .select("employee_id, scope_node_id, created_at, pgems_scope_nodes(id, code, name, organization_id, dimension_id)")
    .eq("employee_id", employeeId);

  if (error) throw error;
  return data ?? [];
}

export async function assignEmployeeScope(employeeId: string, scopeNodeId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employee_scope_assignments")
    .insert({
      employee_id: employeeId,
      scope_node_id: scopeNodeId,
    })
    .select("employee_id, scope_node_id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listDelegations(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_delegations")
    .select("id, organization_id, delegator_employee_id, delegate_employee_id, starts_at, ends_at, status, notes, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createDelegation(payload: {
  organizationId: string;
  delegatorEmployeeId: string;
  delegateEmployeeId: string;
  startsAt: string;
  endsAt: string;
  status: "draft" | "active" | "expired" | "revoked";
  notes?: string;
  operationIds: string[];
}) {
  const supabase = createSupabaseAdminClient();

  const { data: delegation, error } = await supabase
    .from("pgems_delegations")
    .insert({
      organization_id: payload.organizationId,
      delegator_employee_id: payload.delegatorEmployeeId,
      delegate_employee_id: payload.delegateEmployeeId,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      status: payload.status,
      notes: payload.notes ?? null,
    })
    .select("id, organization_id, delegator_employee_id, delegate_employee_id, starts_at, ends_at, status, notes, created_at")
    .single();

  if (error) throw error;

  if (payload.operationIds.length > 0) {
    const { error: operationError } = await supabase
      .from("pgems_delegation_operations")
      .insert(payload.operationIds.map((operationId) => ({ delegation_id: delegation.id, operation_id: operationId })));

    if (operationError) throw operationError;
  }

  return delegation;
}

export async function evaluateEmployeeGovernance(payload: {
  employeeId: string;
  operationCode: string;
  permissionCode: string;
  scopeNodeId?: string;
  amount?: number;
  currencyCode?: string;
  atIso?: string;
}) {
  const supabase = createSupabaseAdminClient();

  const [permissionContext, authority, monetary, operation, scopes, delegationRows] = await Promise.all([
    loadEmployeePermissionContext(payload.employeeId),
    getEmployeeAuthority(payload.employeeId),
    getEmployeeMonetaryAuthority(payload.employeeId),
    supabase
      .from("pgems_approval_operations")
      .select("id, code")
      .eq("code", payload.operationCode)
      .maybeSingle(),
    listEmployeeScopes(payload.employeeId),
    supabase
      .from("pgems_delegations")
      .select("id, starts_at, ends_at, status, delegate_employee_id, pgems_delegation_operations(operation_id, pgems_approval_operations(code))")
      .eq("delegate_employee_id", payload.employeeId),
  ]);

  const authorityLevelObj = authority?.pgems_authority_levels;
  const authorityLevel = Array.isArray(authorityLevelObj) ? authorityLevelObj[0] : authorityLevelObj;
  const actorAuthorityLevel = resolveAuthorityLevelValue({
    baseLevelValue:
      authorityLevel && typeof authorityLevel === "object" && typeof (authorityLevel as Record<string, unknown>).level_value === "number"
        ? ((authorityLevel as Record<string, unknown>).level_value as number)
        : null,
    customLevelValue: authority?.custom_level_value ?? null,
  });

  let minAuthorityLevel: number | null = null;
  let scopeRequired = false;

  if (operation.data?.id) {
    const { data: policy } = await supabase
      .from("pgems_approval_policies")
      .select("min_authority_level, scope_required")
      .eq("operation_id", operation.data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    minAuthorityLevel = policy?.min_authority_level ?? null;
    scopeRequired = policy?.scope_required ?? false;
  }

  const hasMatchingScope = payload.scopeNodeId
    ? scopes.some((scopeRow: Record<string, unknown>) => String(scopeRow.scope_node_id) === payload.scopeNodeId)
    : true;

  const at = payload.atIso ? Date.parse(payload.atIso) : Date.now();
  const hasActiveDelegation = (delegationRows.data ?? []).some((row: Record<string, unknown>) => {
    const status = String(row.status ?? "");
    if (status !== "active") return false;

    const startsAt = Date.parse(String(row.starts_at ?? ""));
    const endsAt = Date.parse(String(row.ends_at ?? ""));
    if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return false;
    if (at < startsAt || at > endsAt) return false;

    const operations = row.pgems_delegation_operations;
    if (!Array.isArray(operations)) return false;

    return operations.some((entry) => {
      const opObj = (entry as Record<string, unknown>).pgems_approval_operations;
      const op = Array.isArray(opObj) ? opObj[0] : opObj;
      const code = op && typeof op === "object" ? (op as Record<string, unknown>).code : null;
      return typeof code === "string" && code.toLowerCase() === payload.operationCode.toLowerCase();
    });
  });

  const result = evaluateEnterpriseGovernance({
    permissionCode: payload.permissionCode,
    rolePermissionCodes: permissionContext.rolePermissionCodes,
    explicitAllowCodes: permissionContext.explicitAllowCodes,
    explicitDenyCodes: permissionContext.explicitDenyCodes,
    actorAuthorityLevel,
    minAuthorityLevel,
    hasMatchingScope,
    scopeRequired,
    hasActiveDelegation,
    amount: payload.amount ?? null,
    currencyCode: payload.currencyCode ?? null,
    actorCurrency: monetary?.currency_code ?? null,
    maximumApprovalAmount: monetary?.maximum_approval_amount ?? null,
    isUnlimitedMonetaryAuthority: monetary?.is_unlimited ?? false,
  });

  return {
    ...result,
    actorAuthorityLevel,
    minAuthorityLevel,
    scopeRequired,
  };
}
