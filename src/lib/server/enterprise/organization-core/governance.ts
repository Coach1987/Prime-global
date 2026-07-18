import { evaluateEnterprisePermission } from "./permissions.ts";
import { hasRequiredAuthority, withinMonetaryAuthority } from "./authority.ts";

export interface GovernanceEvaluationInput {
  permissionCode: string;
  rolePermissionCodes: string[];
  explicitAllowCodes: string[];
  explicitDenyCodes: string[];
  actorAuthorityLevel: number;
  minAuthorityLevel: number | null;
  hasMatchingScope: boolean;
  scopeRequired: boolean;
  hasActiveDelegation: boolean;
  amount: number | null;
  currencyCode: string | null;
  actorCurrency: string | null;
  maximumApprovalAmount: number | null;
  isUnlimitedMonetaryAuthority: boolean;
}

export interface GovernanceEvaluationResult {
  permissionDecision: ReturnType<typeof evaluateEnterprisePermission>;
  authoritySatisfied: boolean;
  scopeSatisfied: boolean;
  delegationActive: boolean;
  monetary: ReturnType<typeof withinMonetaryAuthority>;
  advisoryReady: boolean;
}

export function evaluateEnterpriseGovernance(input: GovernanceEvaluationInput): GovernanceEvaluationResult {
  const permissionDecision = evaluateEnterprisePermission({
    permissionCode: input.permissionCode,
    rolePermissionCodes: input.rolePermissionCodes,
    explicitAllowCodes: input.explicitAllowCodes,
    explicitDenyCodes: input.explicitDenyCodes,
  });

  const authoritySatisfied = input.minAuthorityLevel === null
    ? true
    : hasRequiredAuthority({ actorLevel: input.actorAuthorityLevel, minimumLevel: input.minAuthorityLevel });

  const scopeSatisfied = input.scopeRequired ? input.hasMatchingScope : true;
  const monetary = withinMonetaryAuthority({
    amount: input.amount,
    currencyCode: input.currencyCode,
    actorCurrency: input.actorCurrency,
    maximumApprovalAmount: input.maximumApprovalAmount,
    isUnlimited: input.isUnlimitedMonetaryAuthority,
  });

  return {
    // Keep base permission behavior unchanged for current consumers.
    permissionDecision,
    authoritySatisfied,
    scopeSatisfied,
    delegationActive: input.hasActiveDelegation,
    monetary,
    advisoryReady: permissionDecision.granted && authoritySatisfied && scopeSatisfied && monetary.allowed,
  };
}
