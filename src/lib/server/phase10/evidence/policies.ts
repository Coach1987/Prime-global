import type { Phase10PolicyContext, Phase10PolicyDefinition, Phase10PolicyDecision } from "../policy-engine/index.ts";
import { evaluatePhase10Policies } from "../policy-engine/index.ts";

export const PHASE10_EVIDENCE_STAFF_ROLES = [
  "prime_global_recruiter",
  "prime_global_admin",
  "admin",
  "super_admin",
] as const;

function createStaffOnlyPolicy(name: string, action: string): Phase10PolicyDefinition {
  return {
    name,
    version: "1.0.0",
    scope: "organization",
    subjectRole: "*",
    action,
    condition: (context: Phase10PolicyContext) => {
      const allowed =
        PHASE10_EVIDENCE_STAFF_ROLES.includes(context.actorRole as (typeof PHASE10_EVIDENCE_STAFF_ROLES)[number]) &&
        context.organization.organizationId === "prime-global";

      return {
        passed: allowed,
        explanation: allowed
          ? `${name} is allowed for authorized Prime Global staff in the default organization.`
          : `${name} requires an authorized Prime Global staff role and Prime Global organization scope.`,
        sourceCategories: ["authentication", "role-authorization", "organization-scope"],
        confidence: 1,
        humanReviewRequired: !allowed,
      };
    },
    severity: "high",
    enforcementAction: "block",
    escalationRule: "Prime Global staff review",
    enabled: true,
    effectiveAt: new Date().toISOString(),
    organizationId: "prime-global",
    auditMetadata: { subsystem: "phase10-evidence" },
  };
}

export function evaluatePhase10EvidencePolicy(
  action: string,
  context: Phase10PolicyContext,
  policyName: string
): Phase10PolicyDecision {
  return evaluatePhase10Policies(context, [createStaffOnlyPolicy(policyName, action)]);
}

export function createPhase10EvidencePolicy(action: string, policyName: string): Phase10PolicyDefinition[] {
  return [createStaffOnlyPolicy(policyName, action)];
}
