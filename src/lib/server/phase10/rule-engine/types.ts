import type { Phase10PolicyContext } from "../policy-engine/index.ts";

export interface Phase10BusinessRuleRequirement {
  key: string;
  label: string;
  satisfied: boolean;
  reason: string;
}

export interface Phase10BusinessRuleResult {
  ruleName: string;
  version: string;
  allowed: boolean;
  passedConditions: Phase10BusinessRuleRequirement[];
  failedConditions: Phase10BusinessRuleRequirement[];
  blockingReasons: string[];
  requiredNextActions: string[];
  explanation: string;
  context: Phase10PolicyContext;
}

export interface Phase10BusinessRuleDefinition {
  name: string;
  version: string;
  requires: Array<{ key: string; label: string; check: (context: Phase10PolicyContext) => boolean; failureReason: string }>;
  nextActions: string[];
}
