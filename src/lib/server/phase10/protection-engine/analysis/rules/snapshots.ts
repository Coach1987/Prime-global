import { createHash } from "node:crypto";
import type { ProtectionRule, ProtectionRuleSnapshot } from "./types.ts";

export function createProtectionRuleSnapshot(rule: ProtectionRule): ProtectionRuleSnapshot {
  const payload = {
    ruleId: rule.ruleId,
    stableRuleKey: rule.stableRuleKey,
    ruleVersion: rule.ruleVersion,
    schemaVersion: rule.schemaVersion,
    reasonCode: rule.reasonCode,
    defaultProtectionAction: rule.defaultProtectionAction,
    allowedDisclosureStates: rule.allowedDisclosureStates,
    forbiddenDisclosureStates: rule.forbiddenDisclosureStates,
    policyEnginePolicyIds: rule.policyEnginePolicyIds,
    businessRuleIds: rule.businessRuleIds,
  };

  return {
    ...payload,
    hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
}
