import type { Phase10OrganizationContext } from "../organization/index.ts";

export type Phase10PolicyScope = "global" | "organization" | "tenant" | "conversation" | "interview" | "candidate" | "employer";
export type Phase10PolicySeverity = "low" | "medium" | "high" | "critical";
export type Phase10PolicyEnforcementAction = "allow" | "warn" | "block" | "freeze" | "escalate";

export interface Phase10PolicyConditionResult {
  passed: boolean;
  explanation: string;
  sourceCategories: string[];
  confidence?: number;
  humanReviewRequired: boolean;
}

export interface Phase10PolicyContext {
  actorId?: string | null;
  actorRole: string;
  action: string;
  organization: Phase10OrganizationContext;
  subjectId?: string | null;
  subjectType?: string | null;
  facts: Record<string, unknown>;
}

export interface Phase10PolicyDefinition {
  name: string;
  version: string;
  scope: Phase10PolicyScope;
  subjectRole: string;
  action: string;
  condition: (context: Phase10PolicyContext) => Phase10PolicyConditionResult;
  severity: Phase10PolicySeverity;
  enforcementAction: Phase10PolicyEnforcementAction;
  escalationRule: string;
  enabled: boolean;
  effectiveAt: string;
  organizationId?: string | null;
  tenantId?: string | null;
  auditMetadata: Record<string, unknown>;
}

export interface Phase10PolicyEvaluation {
  policy: Phase10PolicyDefinition;
  passed: boolean;
  explanation: string;
  sourceCategories: string[];
  confidence?: number;
  humanReviewRequired: boolean;
}

export interface Phase10PolicyDecision {
  allowed: boolean;
  matchedPolicies: Phase10PolicyEvaluation[];
  blockingReasons: string[];
  requiredNextActions: string[];
  explanation: string;
}
