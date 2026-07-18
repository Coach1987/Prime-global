import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { evaluateEnterprisePermission } from "./permissions";

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
}) {
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
}) {
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
  return data;
}

export async function assignPermissionToRole(roleId: string, permissionId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_role_permissions")
    .insert({
      role_id: roleId,
      permission_id: permissionId,
    })
    .select("role_id, permission_id, created_at")
    .single();

  if (error) throw error;
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

export async function assignRoleToEmployee(employeeId: string, roleId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_employee_roles")
    .insert({
      employee_id: employeeId,
      role_id: roleId,
    })
    .select("employee_id, role_id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function assignPermissionToEmployee(employeeId: string, permissionId: string, mode: "allow" | "deny") {
  const supabase = createSupabaseAdminClient();
  const table = mode === "allow" ? "pgems_employee_extra_permissions" : "pgems_employee_denied_permissions";
  const { data, error } = await supabase
    .from(table)
    .insert({
      employee_id: employeeId,
      permission_id: permissionId,
    })
    .select("employee_id, permission_id, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function loadEmployeePermissionContext(employeeId: string) {
  const supabase = createSupabaseAdminClient();
  const [rolesResult, rolePermissionsResult, allowResult, denyResult] = await Promise.all([
    supabase
      .from("pgems_employee_roles")
      .select("role_id")
      .eq("employee_id", employeeId),
    supabase
      .from("pgems_employee_roles")
      .select("pgems_role_permissions(permission_id, pgems_permissions(code))")
      .eq("employee_id", employeeId),
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
  if (rolePermissionsResult.error) throw rolePermissionsResult.error;
  if (allowResult.error) throw allowResult.error;
  if (denyResult.error) throw denyResult.error;

  const rolePermissionCodes = (rolePermissionsResult.data ?? [])
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
