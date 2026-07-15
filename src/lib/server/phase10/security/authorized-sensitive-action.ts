import type { Phase10OrganizationContext } from "../organization/index.ts";
import type { Phase10PolicyDecision } from "../policy-engine/index.ts";
import type { Phase10BusinessRuleResult } from "../rule-engine/index.ts";

export interface Phase10SensitiveActionRequest {
  authenticated: boolean;
  actorId?: string | null;
  actorRole?: string | null;
  organization: Phase10OrganizationContext;
  policyDecision?: Phase10PolicyDecision;
  businessRuleResult?: Phase10BusinessRuleResult;
  reason?: string;
}

export interface Phase10SensitiveActionResponse {
  allowed: boolean;
  explanation: string;
  sourceCategories: string[];
  humanReviewRequired: boolean;
  decisionOrigin: "system_rule" | "staff_decision";
}

export function evaluatePhase10SensitiveAction(request: Phase10SensitiveActionRequest): Phase10SensitiveActionResponse {
  if (!request.authenticated) {
    return {
      allowed: false,
      explanation: "Authentication is required before any sensitive Phase 10 action can proceed.",
      sourceCategories: ["authentication"],
      humanReviewRequired: true,
      decisionOrigin: "system_rule",
    };
  }

  if (!request.organization.organizationId) {
    return {
      allowed: false,
      explanation: "An organization or tenant scope is required for sensitive Phase 10 actions.",
      sourceCategories: ["organization-scope"],
      humanReviewRequired: true,
      decisionOrigin: "system_rule",
    };
  }

  if (request.policyDecision && !request.policyDecision.allowed) {
    return {
      allowed: false,
      explanation: request.policyDecision.explanation,
      sourceCategories: ["policy-engine"],
      humanReviewRequired: true,
      decisionOrigin: "system_rule",
    };
  }

  if (request.businessRuleResult && !request.businessRuleResult.allowed) {
    return {
      allowed: false,
      explanation: request.businessRuleResult.explanation,
      sourceCategories: ["business-rule-engine"],
      humanReviewRequired: true,
      decisionOrigin: "system_rule",
    };
  }

  return {
    allowed: true,
    explanation: "Zero-trust checks passed for the requested Phase 10 action.",
    sourceCategories: ["authentication", "organization-scope", "policy-engine", "business-rule-engine"],
    humanReviewRequired: false,
    decisionOrigin: "system_rule",
  };
}
