import { createPhase10OrganizationContext } from "../organization/index.ts";
import type { Phase10PolicyContext, Phase10PolicyDecision, Phase10PolicyDefinition, Phase10PolicyEvaluation } from "./types.ts";
import { phase10PolicyRegistry } from "./policies.ts";

function isPolicyApplicable(policy: Phase10PolicyDefinition, context: Phase10PolicyContext) {
  if (!policy.enabled) return false;
  if (policy.action !== context.action) return false;
  if (policy.subjectRole !== "*" && policy.subjectRole !== context.actorRole) return false;
  if (policy.organizationId && policy.organizationId !== context.organization.organizationId) return false;
  if (policy.tenantId && policy.tenantId !== context.organization.tenantId) return false;
  return true;
}

export function evaluatePhase10Policies(
  input: Partial<Phase10PolicyContext> & Pick<Phase10PolicyContext, "actorRole" | "action">,
  policies: Phase10PolicyDefinition[] = phase10PolicyRegistry
): Phase10PolicyDecision {
  const context: Phase10PolicyContext = {
    actorId: input.actorId ?? null,
    actorRole: input.actorRole,
    action: input.action,
    organization: input.organization ?? createPhase10OrganizationContext(),
    subjectId: input.subjectId ?? null,
    subjectType: input.subjectType ?? null,
    facts: input.facts ?? {},
  };

  const matchedPolicies: Phase10PolicyEvaluation[] = policies
    .filter((policy) => isPolicyApplicable(policy, context))
    .map((policy) => {
      const result = policy.condition(context);
      return {
        policy,
        passed: result.passed,
        explanation: result.explanation,
        sourceCategories: result.sourceCategories,
        confidence: result.confidence,
        humanReviewRequired: result.humanReviewRequired,
      };
    });

  const blockingReasons = matchedPolicies.filter((item) => !item.passed).map((item) => item.explanation);
  const allowed = matchedPolicies.length > 0 && blockingReasons.length === 0;

  return {
    allowed,
    matchedPolicies,
    blockingReasons,
    requiredNextActions: allowed ? [] : ["Review the policy explanation and satisfy the documented prerequisite."],
    explanation: allowed
      ? "All matching policies passed."
      : blockingReasons.length > 0
        ? blockingReasons.join(" ")
        : "No enabled policy matched the requested action.",
  };
}

export function createPhase10PolicyContext(input?: Partial<Phase10PolicyContext>): Phase10PolicyContext {
  return {
    actorId: input?.actorId ?? null,
    actorRole: input?.actorRole ?? "candidate",
    action: input?.action ?? "unknown",
    organization: input?.organization ?? createPhase10OrganizationContext(),
    subjectId: input?.subjectId ?? null,
    subjectType: input?.subjectType ?? null,
    facts: input?.facts ?? {},
  };
}

export { phase10PolicyRegistry };
export type {
  Phase10PolicyContext,
  Phase10PolicyDecision,
  Phase10PolicyDefinition,
  Phase10PolicyEvaluation,
  Phase10PolicyConditionResult,
  Phase10PolicyScope,
  Phase10PolicySeverity,
  Phase10PolicyEnforcementAction,
} from "./types.ts";
