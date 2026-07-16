import { ProtectionRuleValidator } from "./validator.ts";
import type {
  ProtectionRule,
  ProtectionRuleRegistry,
  ProtectionRulesRegistryOptions,
} from "./types.ts";
import type { RecruitmentWorkflowStage } from "../types.ts";

function semverCompare(a: string, b: string): number {
  const pa = a.split(".").map((part) => Number(part));
  const pb = b.split(".").map((part) => Number(part));

  for (let index = 0; index < 3; index += 1) {
    if ((pa[index] ?? 0) > (pb[index] ?? 0)) return 1;
    if ((pa[index] ?? 0) < (pb[index] ?? 0)) return -1;
  }
  return 0;
}

function deterministicSort(left: ProtectionRule, right: ProtectionRule): number {
  if (left.stableRuleKey < right.stableRuleKey) return -1;
  if (left.stableRuleKey > right.stableRuleKey) return 1;
  return semverCompare(left.ruleVersion, right.ruleVersion);
}

function isEffective(rule: ProtectionRule, at: string): boolean {
  const atMs = new Date(at).getTime();
  const fromMs = new Date(rule.effectiveFrom).getTime();
  const untilMs = rule.effectiveUntil ? new Date(rule.effectiveUntil).getTime() : null;
  if (Number.isNaN(atMs) || Number.isNaN(fromMs)) return false;
  if (atMs < fromMs) return false;
  if (untilMs !== null && atMs >= untilMs) return false;
  return true;
}

function assertNoCircularReplacement(rules: ProtectionRule[]): void {
  const byId = new Map(rules.map((rule) => [rule.ruleId, rule]));

  for (const rule of rules) {
    const seen = new Set<string>([rule.ruleId]);
    let current = rule;

    while (current.replacementRuleId) {
      if (!byId.has(current.replacementRuleId)) {
        throw new Error(`invalid_replacement_chain:${rule.ruleId}`);
      }
      if (seen.has(current.replacementRuleId)) {
        throw new Error(`circular_replacement_chain:${rule.ruleId}`);
      }
      seen.add(current.replacementRuleId);
      const next = byId.get(current.replacementRuleId);
      if (!next) break;
      current = next;
    }
  }
}

function validateRegistryRules(rules: ProtectionRule[], now: string): void {
  const validator = new ProtectionRuleValidator();
  const activeById = new Set<string>();
  const activeVersionByKey = new Set<string>();

  for (const rule of rules) {
    const validation = validator.validate(rule);
    if (!validation.valid) {
      throw new Error(`invalid_rule:${rule.ruleId}:${validation.issues[0].code}`);
    }

    if (rule.lifecycleState === "active" && isEffective(rule, now) && rule.enabled) {
      if (activeById.has(rule.ruleId)) {
        throw new Error(`duplicate_active_rule_id:${rule.ruleId}`);
      }
      activeById.add(rule.ruleId);

      const activeVersionKey = `${rule.stableRuleKey}:${rule.ruleVersion}`;
      if (activeVersionByKey.has(activeVersionKey)) {
        throw new Error(`duplicate_active_rule_version:${activeVersionKey}`);
      }
      activeVersionByKey.add(activeVersionKey);
    }

    if (rule.allowedDisclosureStates.length === 0) {
      throw new Error(`rule_without_allowed_states:${rule.ruleId}`);
    }

    const conflicts = rule.allowedDisclosureStates.filter((state) => rule.forbiddenDisclosureStates.includes(state));
    if (conflicts.length > 0) {
      throw new Error(`allowed_forbidden_conflict:${rule.ruleId}`);
    }

    if (rule.immutablePrivacy && rule.allowedDisclosureStates.includes("revealed")) {
      throw new Error(`immutable_field_reveal:${rule.ruleId}`);
    }

    if (rule.lifecycleState === "active" && rule.effectiveUntil && new Date(rule.effectiveUntil).getTime() <= new Date(now).getTime()) {
      throw new Error(`expired_active_rule:${rule.ruleId}`);
    }

    if (!rule.enabled && rule.lifecycleState === "active") {
      throw new Error(`disabled_rule_enforceable:${rule.ruleId}`);
    }
  }

  assertNoCircularReplacement(rules);
}

export class InMemoryProtectionRuleRegistry implements ProtectionRuleRegistry {
  private readonly rules: ProtectionRule[];

  readonly registryVersion: string;

  constructor(rules: ProtectionRule[], options: ProtectionRulesRegistryOptions) {
    const now = options.now ?? new Date().toISOString();
    validateRegistryRules(rules, now);
    this.rules = [...rules].sort(deterministicSort);
    this.registryVersion = options.registryVersion;
  }

  getRuleById(ruleId: string, version?: string): ProtectionRule | null {
    const matches = this.rules.filter((rule) => rule.ruleId === ruleId);
    if (!matches.length) return null;
    if (version) {
      return matches.find((rule) => rule.ruleVersion === version) ?? null;
    }
    return matches[matches.length - 1] ?? null;
  }

  listByCategory(category: ProtectionRule["protectedDataCategory"]): ProtectionRule[] {
    return this.rules.filter((rule) => rule.protectedDataCategory === category);
  }

  listByFindingType(findingType: ProtectionRule["findingTypes"][number]): ProtectionRule[] {
    return this.rules.filter((rule) => rule.findingTypes.includes(findingType));
  }

  listByWorkflowStage(stage: RecruitmentWorkflowStage): ProtectionRule[] {
    return this.rules.filter((rule) => rule.workflowStageConstraints.includes(stage));
  }

  listByActorRole(role: ProtectionRule["actorRoleConstraints"][number]): ProtectionRule[] {
    return this.rules.filter((rule) => rule.actorRoleConstraints.includes(role));
  }

  resolveActiveVersion(stableRuleKey: string, at: string): ProtectionRule | null {
    const candidates = this.rules
      .filter((rule) => rule.stableRuleKey === stableRuleKey)
      .filter((rule) => rule.lifecycleState === "active")
      .filter((rule) => rule.enabled)
      .filter((rule) => isEffective(rule, at))
      .sort((left, right) => semverCompare(left.ruleVersion, right.ruleVersion));

    return candidates[candidates.length - 1] ?? null;
  }

  listEffectiveAt(at: string): ProtectionRule[] {
    return this.rules.filter((rule) => isEffective(rule, at));
  }

  listByOrganizationScope(organizationId: string, tenantId: string | null): ProtectionRule[] {
    return this.rules.filter((rule) => {
      const orgOk = rule.organizationScope === "any" || rule.organizationScope === organizationId;
      const tenantOk = rule.tenantScope === "any" || rule.tenantScope === tenantId;
      return orgOk && tenantOk;
    });
  }

  getReplacementRule(ruleId: string): ProtectionRule | null {
    const rule = this.getRuleById(ruleId);
    if (!rule?.replacementRuleId) return null;
    return this.getRuleById(rule.replacementRuleId);
  }

  resolveDeprecatedRule(ruleId: string): { current: ProtectionRule | null; replacement: ProtectionRule | null } {
    const current = this.getRuleById(ruleId);
    if (!current) return { current: null, replacement: null };
    if (!current.deprecated) return { current, replacement: null };
    return { current, replacement: this.getReplacementRule(ruleId) };
  }

  listRulesDeterministic(): ProtectionRule[] {
    return [...this.rules];
  }

  getHistory(stableRuleKey: string): ProtectionRule[] {
    return this.rules.filter((rule) => rule.stableRuleKey === stableRuleKey).sort((left, right) => semverCompare(left.ruleVersion, right.ruleVersion));
  }
}
