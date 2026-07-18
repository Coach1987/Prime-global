import type { EnterprisePermissionDecision } from "./types";

function normalize(values: string[]) {
  return new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean));
}

export function evaluateEnterprisePermission({
  permissionCode,
  rolePermissionCodes,
  explicitAllowCodes,
  explicitDenyCodes,
}: {
  permissionCode: string;
  rolePermissionCodes: string[];
  explicitAllowCodes: string[];
  explicitDenyCodes: string[];
}): EnterprisePermissionDecision {
  const requested = permissionCode.trim().toLowerCase();
  const denies = normalize(explicitDenyCodes);
  if (denies.has(requested)) {
    return { granted: false, source: "explicit_deny", permissionCode: requested };
  }

  const allows = normalize(explicitAllowCodes);
  if (allows.has(requested)) {
    return { granted: true, source: "explicit_allow", permissionCode: requested };
  }

  const rolePermissions = normalize(rolePermissionCodes);
  if (rolePermissions.has(requested)) {
    return { granted: true, source: "role_permission", permissionCode: requested };
  }

  return { granted: false, source: "default_deny", permissionCode: requested };
}
