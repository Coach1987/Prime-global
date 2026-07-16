import type { ProtectionRuleRegistry } from "./types.ts";
import { createProtectionRuleSnapshot } from "./snapshots.ts";
import type {
  ProtectionRule,
  ResolvedRuleDecisionReference,
  ProtectionRuleResolutionInput,
  ProtectionRuleResolutionResult,
} from "./types.ts";

function matchesScope(rule: ProtectionRule, input: ProtectionRuleResolutionInput): boolean {
  const orgMatch = rule.organizationScope === "any" || rule.organizationScope === input.organizationId;
  const tenantMatch = rule.tenantScope === "any" || rule.tenantScope === input.tenantId;
  return orgMatch && tenantMatch;
}

function matchesInput(rule: ProtectionRule, input: ProtectionRuleResolutionInput): { matches: boolean; reasons: string[]; blocking: string[] } {
  const reasons: string[] = [];
  const blocking: string[] = [];

  if (input.findingType && !rule.findingTypes.includes(input.findingType)) {
    return { matches: false, reasons, blocking: ["finding_type_mismatch"] };
  }

  if (input.fieldCategory && !rule.fieldCategories.includes(input.fieldCategory)) {
    return { matches: false, reasons, blocking: ["field_category_mismatch"] };
  }

  if (!rule.workflowStageConstraints.includes(input.workflowStage)) {
    return { matches: false, reasons, blocking: ["workflow_stage_mismatch"] };
  }

  if (!rule.actorRoleConstraints.includes(input.actorRole)) {
    return { matches: false, reasons, blocking: ["actor_role_mismatch"] };
  }

  if (!matchesScope(rule, input)) {
    return { matches: false, reasons, blocking: ["organization_scope_mismatch"] };
  }

  if (!rule.enabled || rule.lifecycleState === "disabled") {
    return { matches: false, reasons, blocking: ["rule_disabled"] };
  }

  if (input.freezeState && rule.freezeRestrictions) {
    return { matches: false, reasons, blocking: ["active_freeze"] };
  }

  if (input.criticalViolationState && rule.criticalViolationRestrictions) {
    return { matches: false, reasons, blocking: ["active_critical_violation"] };
  }

  if (rule.revealPrerequisites.paymentRequired && input.paymentStatus !== "verified") {
    return { matches: false, reasons, blocking: ["payment_not_verified"] };
  }

  if (rule.revealPrerequisites.contractStateRequired === "must_be_signed" && input.contractState !== "signed") {
    return { matches: false, reasons, blocking: ["contract_not_signed"] };
  }

  if (rule.consentRequirements.length > 0 && !rule.consentRequirements.includes(input.consentVersion)) {
    return { matches: false, reasons, blocking: ["consent_version_mismatch"] };
  }

  reasons.push("rule_constraints_matched");
  return { matches: true, reasons, blocking };
}

function strictPrivacyFallback(explanation: string): ProtectionRuleResolutionResult {
  return {
    selectedRuleId: "PG-STRICT-PRIVACY-FALLBACK",
    selectedVersion: "1.0.0",
    matchingReasons: ["fallback"],
    rejectedCandidateRules: [],
    policyLinks: ["phase10.protection.level.evaluate"],
    businessRuleLinks: ["Unlock Contract"],
    defaultProtectionAction: "replace_placeholder",
    defaultDisclosureState: "staff_only",
    revealEligibility: false,
    blockingReasons: ["no_matching_active_rule"],
    requiredNextActions: ["Continue with strict private protection path."],
    humanReviewRequirement: true,
    explanation,
    fallbackRuleUsed: true,
    deprecatedRuleWarning: false,
  };
}

export class ProtectionRuleResolver {
  private readonly registry: ProtectionRuleRegistry;

  private readonly registryVersion: string;

  constructor(registry: ProtectionRuleRegistry, registryVersion: string) {
    this.registry = registry;
    this.registryVersion = registryVersion;
  }

  resolve(input: ProtectionRuleResolutionInput): ProtectionRuleResolutionResult {
    const effectiveRules = this.registry.listEffectiveAt(input.evaluationTimestamp);
    const rejected: ProtectionRuleResolutionResult["rejectedCandidateRules"] = [];

    const matches: Array<{ rule: ProtectionRule; reasons: string[] }> = [];

    for (const rule of effectiveRules) {
      const check = matchesInput(rule, input);
      if (check.matches) {
        matches.push({ rule, reasons: check.reasons });
      } else {
        rejected.push({
          ruleId: rule.ruleId,
          ruleVersion: rule.ruleVersion,
          reason: check.blocking.join(",") || "not_applicable",
        });
      }
    }

    const selected = matches.sort((left, right) => {
      if (left.rule.immutablePrivacy !== right.rule.immutablePrivacy) {
        return left.rule.immutablePrivacy ? -1 : 1;
      }
      return left.rule.ruleVersion.localeCompare(right.rule.ruleVersion);
    })[0];

    if (!selected) {
      const fallback = strictPrivacyFallback("No valid rule matched. Strict privacy fallback applied.");
      fallback.rejectedCandidateRules = rejected;
      return fallback;
    }

    return {
      selectedRuleId: selected.rule.ruleId,
      selectedVersion: selected.rule.ruleVersion,
      matchingReasons: selected.reasons,
      rejectedCandidateRules: rejected,
      policyLinks: selected.rule.policyEnginePolicyIds,
      businessRuleLinks: selected.rule.businessRuleIds,
      defaultProtectionAction: selected.rule.defaultProtectionAction,
      defaultDisclosureState: selected.rule.defaultDisclosureState,
      revealEligibility: selected.rule.revealEligibility,
      blockingReasons: [],
      requiredNextActions: selected.rule.revealEligibility ? ["Require staff approval before reveal."] : [],
      humanReviewRequirement: selected.rule.humanReviewRequirements,
      explanation: selected.rule.internalExplanation,
      fallbackRuleUsed: false,
      deprecatedRuleWarning: selected.rule.deprecated,
    };
  }

  createDecisionReference(result: ProtectionRuleResolutionResult): ResolvedRuleDecisionReference {
    const rule = this.registry.getRuleById(result.selectedRuleId, result.selectedVersion);

    if (!rule) {
      return {
        ruleId: result.selectedRuleId,
        ruleVersion: result.selectedVersion,
        registryVersion: this.registryVersion,
        policyIds: result.policyLinks,
        businessRuleIds: result.businessRuleLinks,
        ruleSnapshotHash: "fallback",
        resolutionTimestamp: new Date().toISOString(),
        effectiveDateUsed: new Date().toISOString(),
        fallbackApplied: true,
        deprecatedRuleWarning: false,
        humanReviewRequirement: true,
      };
    }

    const snapshot = createProtectionRuleSnapshot(rule);

    return {
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      registryVersion: this.registryVersion,
      policyIds: rule.policyEnginePolicyIds,
      businessRuleIds: rule.businessRuleIds,
      ruleSnapshotHash: snapshot.hash,
      resolutionTimestamp: new Date().toISOString(),
      effectiveDateUsed: rule.effectiveFrom,
      fallbackApplied: result.fallbackRuleUsed,
      deprecatedRuleWarning: rule.deprecated,
      humanReviewRequirement: result.humanReviewRequirement,
    };
  }
}
