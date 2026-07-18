export type EnterprisePermissionSource = "explicit_deny" | "explicit_allow" | "role_permission" | "default_deny";

export interface EnterprisePermissionDecision {
  granted: boolean;
  source: EnterprisePermissionSource;
  permissionCode: string;
}

export interface EnterpriseEmployeeNode {
  id: string;
  managerEmployeeId: string | null;
}

export interface EnterpriseEmployeeHierarchy {
  employeeId: string;
  managerChain: string[];
  directReports: string[];
  allReports: string[];
}
