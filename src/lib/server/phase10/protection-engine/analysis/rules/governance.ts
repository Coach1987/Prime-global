import { ProtectionRuleValidator } from "./validator.ts";
import type { ProtectionRule, ProtectionRuleResolutionInput, ProtectionRuleResolutionResult } from "./types.ts";
import type { ProtectionRuleRegistry } from "./types.ts";
import { ProtectionRuleResolver } from "./resolver.ts";

export interface GovernanceActor {
  actorId: string;
  role: "candidate" | "employer" | "prime_global_staff" | "system";
}

export interface CreateProtectionRuleCommand {
  actor: GovernanceActor;
  draftRule: ProtectionRule;
}

export interface PublishProtectionRuleVersionCommand {
  actor: GovernanceActor;
  ruleId: string;
  ruleVersion: string;
}

export interface DeprecateProtectionRuleCommand {
  actor: GovernanceActor;
  ruleId: string;
  replacementRuleId: string;
}

export interface ReplaceProtectionRuleCommand {
  actor: GovernanceActor;
  ruleId: string;
  replacementRuleId: string;
}

export interface DisableProtectionRuleCommand {
  actor: GovernanceActor;
  ruleId: string;
}

export interface GetProtectionRuleQuery {
  actor: GovernanceActor;
  ruleId: string;
  version?: string;
}

export interface ListProtectionRulesQuery {
  actor: GovernanceActor;
}

export interface ValidateProtectionRuleQuery {
  actor: GovernanceActor;
  rule: ProtectionRule;
}

export interface ResolveProtectionRuleQuery {
  actor: GovernanceActor;
  input: ProtectionRuleResolutionInput;
}

export interface GetProtectionRuleHistoryQuery {
  actor: GovernanceActor;
  stableRuleKey: string;
}

export interface GovernanceStores {
  registry: ProtectionRuleRegistry;
  draftStore: Map<string, ProtectionRule>;
  appendAudit: (event: string, metadata: Record<string, unknown>) => Promise<void>;
  appendEvidence: (metadataHash: string, metadata: Record<string, unknown>) => Promise<void>;
  emitEvent: (eventType: string, metadata: Record<string, unknown>) => Promise<void>;
}

function assertStaff(actor: GovernanceActor): void {
  if (actor.role !== "prime_global_staff") {
    throw new Error("governance_authorization_denied");
  }
}

function hash(metadata: Record<string, unknown>): string {
  return `ruleh:${Buffer.from(JSON.stringify(metadata)).toString("base64").slice(0, 24)}`;
}

export class ProtectionRuleGovernanceService {
  private readonly validator = new ProtectionRuleValidator();

  private readonly stores: GovernanceStores;

  private readonly resolver: ProtectionRuleResolver;

  constructor(stores: GovernanceStores, resolver: ProtectionRuleResolver) {
    this.stores = stores;
    this.resolver = resolver;
  }

  async createProtectionRule(command: CreateProtectionRuleCommand): Promise<ProtectionRule> {
    assertStaff(command.actor);
    this.stores.draftStore.set(`${command.draftRule.ruleId}:${command.draftRule.ruleVersion}`, command.draftRule);
    await this.stores.appendAudit("rule_creation", { ruleId: command.draftRule.ruleId, version: command.draftRule.ruleVersion });
    await this.stores.emitEvent("ProtectionRuleDrafted", { ruleId: command.draftRule.ruleId, version: command.draftRule.ruleVersion });
    return command.draftRule;
  }

  async publishProtectionRuleVersion(command: PublishProtectionRuleVersionCommand): Promise<ProtectionRule> {
    assertStaff(command.actor);
    const key = `${command.ruleId}:${command.ruleVersion}`;
    const draft = this.stores.draftStore.get(key);
    if (!draft) throw new Error("rule_draft_not_found");

    const validation = this.validator.validate(draft);
    if (!validation.valid) {
      await this.stores.emitEvent("ProtectionRuleValidationFailed", { ruleId: command.ruleId, issues: validation.issues.map((issue) => issue.code) });
      throw new Error(`rule_validation_failed:${validation.issues[0].code}`);
    }

    draft.lifecycleState = "active";
    draft.enabled = true;
    draft.updatedAt = new Date().toISOString();

    await this.stores.appendAudit("rule_publication", { ruleId: draft.ruleId, version: draft.ruleVersion });
    await this.stores.appendEvidence(hash({ ruleId: draft.ruleId, version: draft.ruleVersion }), {
      ruleId: draft.ruleId,
      version: draft.ruleVersion,
    });
    await this.stores.emitEvent("ProtectionRulePublished", { ruleId: draft.ruleId, version: draft.ruleVersion });
    return draft;
  }

  async deprecateProtectionRule(command: DeprecateProtectionRuleCommand): Promise<void> {
    assertStaff(command.actor);
    const rule = this.stores.registry.getRuleById(command.ruleId);
    if (!rule) throw new Error("rule_not_found");

    rule.deprecated = true;
    rule.lifecycleState = "deprecated";
    rule.replacementRuleId = command.replacementRuleId;
    rule.updatedAt = new Date().toISOString();

    await this.stores.appendAudit("rule_deprecation", { ruleId: command.ruleId, replacementRuleId: command.replacementRuleId });
    await this.stores.emitEvent("ProtectionRuleDeprecated", { ruleId: command.ruleId, replacementRuleId: command.replacementRuleId });
  }

  async replaceProtectionRule(command: ReplaceProtectionRuleCommand): Promise<void> {
    assertStaff(command.actor);
    const current = this.stores.registry.getRuleById(command.ruleId);
    const replacement = this.stores.registry.getRuleById(command.replacementRuleId);
    if (!current || !replacement) throw new Error("rule_not_found");

    current.replacementRuleId = replacement.ruleId;
    current.deprecated = true;
    current.lifecycleState = "deprecated";
    current.updatedAt = new Date().toISOString();

    await this.stores.appendAudit("rule_replacement", { ruleId: command.ruleId, replacementRuleId: command.replacementRuleId });
    await this.stores.emitEvent("ProtectionRuleReplaced", { ruleId: command.ruleId, replacementRuleId: command.replacementRuleId });
  }

  async disableProtectionRule(command: DisableProtectionRuleCommand): Promise<void> {
    assertStaff(command.actor);
    const rule = this.stores.registry.getRuleById(command.ruleId);
    if (!rule) throw new Error("rule_not_found");

    rule.enabled = false;
    rule.lifecycleState = "disabled";
    rule.updatedAt = new Date().toISOString();

    await this.stores.appendAudit("rule_disablement", { ruleId: command.ruleId });
    await this.stores.emitEvent("ProtectionRuleDisabled", { ruleId: command.ruleId });
  }

  async getProtectionRule(query: GetProtectionRuleQuery): Promise<ProtectionRule | null> {
    assertStaff(query.actor);
    return this.stores.registry.getRuleById(query.ruleId, query.version);
  }

  async listProtectionRules(query: ListProtectionRulesQuery): Promise<ProtectionRule[]> {
    assertStaff(query.actor);
    return this.stores.registry.listRulesDeterministic();
  }

  async validateProtectionRule(query: ValidateProtectionRuleQuery) {
    assertStaff(query.actor);
    const result = this.validator.validate(query.rule);
    await this.stores.emitEvent("ProtectionRuleValidated", {
      ruleId: query.rule.ruleId,
      valid: result.valid,
    });
    return result;
  }

  async resolveProtectionRule(query: ResolveProtectionRuleQuery): Promise<ProtectionRuleResolutionResult> {
    assertStaff(query.actor);
    const resolved = this.resolver.resolve(query.input);
    await this.stores.appendAudit("rule_resolution", {
      selectedRuleId: resolved.selectedRuleId,
      selectedVersion: resolved.selectedVersion,
      fallbackRuleUsed: resolved.fallbackRuleUsed,
    });
    await this.stores.emitEvent("ProtectionRuleResolved", {
      selectedRuleId: resolved.selectedRuleId,
      selectedVersion: resolved.selectedVersion,
      fallbackRuleUsed: resolved.fallbackRuleUsed,
    });
    if (resolved.fallbackRuleUsed) {
      await this.stores.emitEvent("ProtectionRuleFallbackApplied", {
        selectedRuleId: resolved.selectedRuleId,
      });
    }
    return resolved;
  }

  async getProtectionRuleHistory(query: GetProtectionRuleHistoryQuery): Promise<ProtectionRule[]> {
    assertStaff(query.actor);
    return this.stores.registry.getHistory(query.stableRuleKey);
  }
}
