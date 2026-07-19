import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";
import { evaluateEnterprisePermission } from "./permissions";

interface GovernanceAuditActor {
  actorAuthUserId?: string;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

async function writeGovernanceAuditLog(payload: {
  organizationId?: string;
  eventType: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
  actor?: GovernanceAuditActor;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc("pgems_log_governance_event", {
    p_organization_id: payload.organizationId ?? null,
    p_event_type: payload.eventType,
    p_actor_auth_user_id: payload.actor?.actorAuthUserId ?? null,
    p_actor_employee_id: null,
    p_actor_role: payload.actor?.actorRole ?? null,
    p_target_type: payload.targetType ?? null,
    p_target_id: payload.targetId ?? null,
    p_severity: payload.severity ?? "info",
    p_metadata: payload.metadata ?? {},
    p_ip_address: payload.actor?.ipAddress ?? null,
    p_user_agent: payload.actor?.userAgent ?? null,
  });

  if (error) {
    await createAuditLog({
      actorAuthUserId: payload.actor?.actorAuthUserId,
      actorRole: payload.actor?.actorRole,
      action: payload.eventType,
      targetType: payload.targetType,
      targetId: payload.targetId,
      metadata: payload.metadata,
      ipAddress: payload.actor?.ipAddress,
      userAgent: payload.actor?.userAgent,
    });
  }
}

export async function listOrganizations() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_organizations")
    .select("id, legal_name, display_name, code, employer_id, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createOrganization(payload: {
  legalName: string;
  displayName: string;
  code: string;
  employerId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_organizations")
    .insert({
      legal_name: payload.legalName,
      display_name: payload.displayName,
      code: payload.code,
      employer_id: payload.employerId ?? null,
    })
    .select("id, legal_name, display_name, code, employer_id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listDivisions(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_divisions")
    .select("id, organization_id, name, code, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createDivision(payload: {
  organizationId: string;
  name: string;
  code: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_divisions")
    .insert({
      organization_id: payload.organizationId,
      name: payload.name,
      code: payload.code,
    })
    .select("id, organization_id, name, code, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listDepartments(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_departments")
    .select("id, organization_id, division_id, name, code, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createDepartment(payload: {
  organizationId: string;
  divisionId: string;
  name: string;
  code: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_departments")
    .insert({
      organization_id: payload.organizationId,
      division_id: payload.divisionId,
      name: payload.name,
      code: payload.code,
    })
    .select("id, organization_id, division_id, name, code, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listTeams(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_teams")
    .select("id, organization_id, department_id, name, code, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createTeam(payload: {
  organizationId: string;
  departmentId: string;
  name: string;
  code: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_teams")
    .insert({
      organization_id: payload.organizationId,
      department_id: payload.departmentId,
      name: payload.name,
      code: payload.code,
    })
    .select("id, organization_id, department_id, name, code, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listPositions(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_positions")
    .select("id, organization_id, department_id, team_id, title, code, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPosition(payload: {
  organizationId: string;
  departmentId: string;
  teamId?: string;
  title: string;
  code: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_positions")
    .insert({
      organization_id: payload.organizationId,
      department_id: payload.departmentId,
      team_id: payload.teamId ?? null,
      title: payload.title,
      code: payload.code,
    })
    .select("id, organization_id, department_id, team_id, title, code, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listEmployees(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employees")
    .select("id, organization_id, employee_number, full_name, email, position_id, manager_employee_id, is_active, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createEmployee(payload: {
  organizationId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  positionId: string;
  managerEmployeeId?: string;
  isActive?: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employees")
    .insert({
      organization_id: payload.organizationId,
      employee_number: payload.employeeNumber,
      full_name: payload.fullName,
      email: payload.email,
      position_id: payload.positionId,
      manager_employee_id: payload.managerEmployeeId ?? null,
      is_active: payload.isActive ?? true,
    })
    .select("id, organization_id, employee_number, full_name, email, position_id, manager_employee_id, is_active, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listRoles(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_roles")
    .select("id, organization_id, name, code, description, is_system, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createRole(payload: {
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  isSystem?: boolean;
}, actor?: GovernanceAuditActor) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_roles")
    .insert({
      organization_id: payload.organizationId,
      name: payload.name,
      code: payload.code,
      description: payload.description ?? null,
      is_system: payload.isSystem ?? false,
    })
    .select("id, organization_id, name, code, description, is_system, created_at")
    .single();

  if (error) throw error;

  await writeGovernanceAuditLog({
    organizationId: payload.organizationId,
    eventType: "governance.role.created",
    targetType: "role",
    targetId: data.id,
    metadata: { code: payload.code, isSystem: payload.isSystem ?? false },
    actor,
  });

  return data;
}

export async function listPermissions() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_permissions")
    .select("id, code, name, description, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPermission(payload: {
  code: string;
  name: string;
  description?: string;
}, actor?: GovernanceAuditActor) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_permissions")
    .insert({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
    })
    .select("id, code, name, description, created_at")
    .single();

  if (error) throw error;

  await writeGovernanceAuditLog({
    eventType: "governance.permission.created",
    targetType: "permission",
    targetId: data.id,
    metadata: { code: payload.code },
    actor,
  });

  return data;
}

export async function assignPermissionToRole(roleId: string, permissionId: string, actor?: GovernanceAuditActor) {
  const supabase = createSupabaseAdminClient();
  const { data: role } = await supabase
    .from("pgems_roles")
    .select("organization_id")
    .eq("id", roleId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("pgems_role_permissions")
    .insert({
      role_id: roleId,
      permission_id: permissionId,
    })
    .select("role_id, permission_id, created_at")
    .single();

  if (error) throw error;

  await writeGovernanceAuditLog({
    organizationId: role?.organization_id ? String(role.organization_id) : undefined,
    eventType: "governance.role.permission.assigned",
    targetType: "role_permission",
    targetId: `${roleId}:${permissionId}`,
    metadata: { roleId, permissionId },
    actor,
  });

  return data;
}

export async function listRolePermissions(roleId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_role_permissions")
    .select("role_id, permission_id, pgems_permissions(code, name)")
    .eq("role_id", roleId);

  if (error) throw error;
  return data ?? [];
}

export async function assignRoleToEmployee(employeeId: string, roleId: string, actor?: GovernanceAuditActor) {
  const supabase = createSupabaseAdminClient();
  const { data: employee } = await supabase
    .from("pgems_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();

  const { data, error } = await supabase
    .from("pgems_employee_roles")
    .insert({
      employee_id: employeeId,
      role_id: roleId,
    })
    .select("employee_id, role_id, created_at")
    .single();

  if (error) throw error;

  await writeGovernanceAuditLog({
    organizationId: employee?.organization_id ? String(employee.organization_id) : undefined,
    eventType: "governance.employee.role.assigned",
    targetType: "employee_role",
    targetId: `${employeeId}:${roleId}`,
    metadata: { employeeId, roleId },
    actor,
  });

  return data;
}

export async function assignPermissionToEmployee(employeeId: string, permissionId: string, mode: "allow" | "deny", actor?: GovernanceAuditActor) {
  const supabase = createSupabaseAdminClient();
  const table = mode === "allow" ? "pgems_employee_extra_permissions" : "pgems_employee_denied_permissions";
  const { data: employee } = await supabase
    .from("pgems_employees")
    .select("organization_id")
    .eq("id", employeeId)
    .maybeSingle();

  const { data, error } = await supabase
    .from(table)
    .insert({
      employee_id: employeeId,
      permission_id: permissionId,
    })
    .select("employee_id, permission_id, created_at")
    .single();

  if (error) throw error;

  await writeGovernanceAuditLog({
    organizationId: employee?.organization_id ? String(employee.organization_id) : undefined,
    eventType: mode === "allow" ? "governance.employee.permission.allowed" : "governance.employee.permission.denied",
    targetType: "employee_permission",
    targetId: `${employeeId}:${permissionId}`,
    metadata: { employeeId, permissionId, mode },
    actor,
  });

  return data;
}

export async function loadEmployeePermissionContext(employeeId: string) {
  const supabase = createSupabaseAdminClient();
  const [rolesResult, inheritedPermissionsResult, allowResult, denyResult] = await Promise.all([
    supabase
      .from("pgems_employee_roles")
      .select("role_id")
      .eq("employee_id", employeeId),
    supabase.rpc("pgems_resolve_employee_permission_codes", { p_employee_id: employeeId }),
    supabase
      .from("pgems_employee_extra_permissions")
      .select("permission_id, pgems_permissions(code)")
      .eq("employee_id", employeeId),
    supabase
      .from("pgems_employee_denied_permissions")
      .select("permission_id, pgems_permissions(code)")
      .eq("employee_id", employeeId),
  ]);

  if (rolesResult.error) throw rolesResult.error;
  if (allowResult.error) throw allowResult.error;
  if (denyResult.error) throw denyResult.error;

  let rolePermissionCodes: string[] = [];

  if (!inheritedPermissionsResult.error && Array.isArray(inheritedPermissionsResult.data)) {
    rolePermissionCodes = inheritedPermissionsResult.data
      .flatMap((row: Record<string, unknown>) => {
        const code = row.permission_code;
        return typeof code === "string" ? [code] : [];
      });
  } else {
    const fallbackRolePermissionsResult = await supabase
      .from("pgems_employee_roles")
      .select("pgems_role_permissions(permission_id, pgems_permissions(code))")
      .eq("employee_id", employeeId);

    if (fallbackRolePermissionsResult.error) throw fallbackRolePermissionsResult.error;

    rolePermissionCodes = (fallbackRolePermissionsResult.data ?? [])
      .flatMap((row: Record<string, unknown>) => {
        const rawPermissions = row.pgems_role_permissions;
        if (!Array.isArray(rawPermissions)) return [];
        return rawPermissions.flatMap((permissionEntry) => {
          const permission = (permissionEntry as Record<string, unknown>).pgems_permissions;
          if (!permission || Array.isArray(permission)) return [];
          const code = (permission as Record<string, unknown>).code;
          return typeof code === "string" ? [code] : [];
        });
      });
  }

  const explicitAllowCodes = (allowResult.data ?? []).flatMap((row: Record<string, unknown>) => {
    const permission = row.pgems_permissions;
    if (!permission || Array.isArray(permission)) return [];
    const code = (permission as Record<string, unknown>).code;
    return typeof code === "string" ? [code] : [];
  });

  const explicitDenyCodes = (denyResult.data ?? []).flatMap((row: Record<string, unknown>) => {
    const permission = row.pgems_permissions;
    if (!permission || Array.isArray(permission)) return [];
    const code = (permission as Record<string, unknown>).code;
    return typeof code === "string" ? [code] : [];
  });

  return {
    roleIds: (rolesResult.data ?? []).map((row) => String(row.role_id)),
    rolePermissionCodes,
    explicitAllowCodes,
    explicitDenyCodes,
  };
}

export async function evaluateEmployeePermission(employeeId: string, permissionCode: string) {
  const context = await loadEmployeePermissionContext(employeeId);
  return evaluateEnterprisePermission({
    permissionCode,
    rolePermissionCodes: context.rolePermissionCodes,
    explicitAllowCodes: context.explicitAllowCodes,
    explicitDenyCodes: context.explicitDenyCodes,
  });
}

export async function bootstrapCorporateGovernance(organizationId: string, actor?: GovernanceAuditActor) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("pgems_seed_corporate_governance", {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  await writeGovernanceAuditLog({
    organizationId,
    eventType: "governance.bootstrap.executed",
    targetType: "organization",
    targetId: organizationId,
    severity: "critical",
    actor,
  });

  return { organizationId, seeded: true };
}

export async function upsertGovernanceControls(payload: {
  organizationId: string;
  ownerEmployeeId: string;
  ceoEmployeeId?: string;
  ownerRoleId?: string;
  ceoRoleId?: string;
  immutableOwnerAccount?: boolean;
  protectCeoAccount?: boolean;
  emergencyRecoveryEnabled?: boolean;
}, actor?: GovernanceAuditActor) {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("pgems_governance_controls")
    .upsert(
      {
        organization_id: payload.organizationId,
        owner_employee_id: payload.ownerEmployeeId,
        ceo_employee_id: payload.ceoEmployeeId ?? null,
        owner_role_id: payload.ownerRoleId ?? null,
        ceo_role_id: payload.ceoRoleId ?? null,
        immutable_owner_account: payload.immutableOwnerAccount ?? true,
        protect_ceo_account: payload.protectCeoAccount ?? true,
        emergency_recovery_enabled: payload.emergencyRecoveryEnabled ?? true,
      },
      { onConflict: "organization_id" }
    )
    .select("organization_id, owner_employee_id, ceo_employee_id, owner_role_id, ceo_role_id, immutable_owner_account, protect_ceo_account, emergency_recovery_enabled")
    .single();

  if (error) throw error;

  await writeGovernanceAuditLog({
    organizationId: payload.organizationId,
    eventType: "governance.controls.upserted",
    targetType: "governance_controls",
    targetId: payload.organizationId,
    severity: "critical",
    metadata: {
      ownerEmployeeId: payload.ownerEmployeeId,
      ceoEmployeeId: payload.ceoEmployeeId ?? null,
      immutableOwnerAccount: payload.immutableOwnerAccount ?? true,
      protectCeoAccount: payload.protectCeoAccount ?? true,
      emergencyRecoveryEnabled: payload.emergencyRecoveryEnabled ?? true,
    },
    actor,
  });

  return data;
}
