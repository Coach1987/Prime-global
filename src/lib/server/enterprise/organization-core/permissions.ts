import type { EnterprisePermissionDecision } from "./types";

function normalize(values: string[]) {
  return new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function toTokens(code: string) {
  return code
    .trim()
    .toLowerCase()
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

function matchesPermission(grantedCode: string, requestedCode: string) {
  if (grantedCode === "*") return true;

  const grantedTokens = toTokens(grantedCode);
  const requestedTokens = toTokens(requestedCode);

  if (grantedTokens.length === 0 || requestedTokens.length === 0) return false;

  for (let index = 0; index < grantedTokens.length; index += 1) {
    const grantedToken = grantedTokens[index];
    const requestedToken = requestedTokens[index];

    if (grantedToken === "*") return true;
    if (!requestedToken) return false;
    if (grantedToken !== requestedToken) return false;
  }

  return grantedTokens.length === requestedTokens.length;
}

function hasMatch(codes: Set<string>, requestedCode: string) {
  for (const code of codes) {
    if (matchesPermission(code, requestedCode)) {
      return true;
    }
  }

  return false;
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
  if (hasMatch(denies, requested)) {
    return { granted: false, source: "explicit_deny", permissionCode: requested };
  }

  const allows = normalize(explicitAllowCodes);
  if (hasMatch(allows, requested)) {
    return { granted: true, source: "explicit_allow", permissionCode: requested };
  }

  const rolePermissions = normalize(rolePermissionCodes);
  if (hasMatch(rolePermissions, requested)) {
    return { granted: true, source: "role_permission", permissionCode: requested };
  }

  return { granted: false, source: "default_deny", permissionCode: requested };
}
