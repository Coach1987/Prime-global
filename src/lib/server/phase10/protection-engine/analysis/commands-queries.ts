import type { Phase10PolicyDecision } from "../../policy-engine/index.ts";
import type { Phase10BusinessRuleResult } from "../../rule-engine/index.ts";
import { createPhase10OrganizationContext } from "../../organization/index.ts";
import { evaluateAdaptiveProtectionLevel } from "./adaptive-protection.ts";
import { createDisclosureManifest, toEmployerSafeDisclosureProjection, updateManifestField } from "./disclosure-manifest.ts";
import { transitionDisclosureState } from "./disclosure-state-machine.ts";
import type { ResolvedRuleDecisionReference, ProtectionRuleResolutionInput } from "./rules/types.ts";
import type {
  AdaptiveProtectionContext,
  DisclosureFieldCategory,
  DisclosureManifest,
  ExplainableProtectionDecision,
  ProtectionPlan,
} from "./types.ts";

export interface EvaluateProtectionLevelCommand {
  planId: string;
  context: AdaptiveProtectionContext;
}

export interface RequestFieldRevealCommand {
  planId: string;
  fieldCategory: DisclosureFieldCategory;
  requestedByActorId: string;
  context: AdaptiveProtectionContext;
  reason: string;
}

export interface ApproveFieldRevealCommand {
  planId: string;
  fieldCategory: DisclosureFieldCategory;
  approvedByStaffId: string;
  context: AdaptiveProtectionContext;
  justification: string;
}

export interface RevokeFieldRevealCommand {
  planId: string;
  fieldCategory: DisclosureFieldCategory;
  revokedByStaffId: string;
  context: AdaptiveProtectionContext;
  reason: string;
}

export interface GetDisclosureManifestQuery {
  planId: string;
}

export interface GetProtectionDecisionExplanationQuery {
  decisionId: string;
}

export interface ProtectionPlanStore {
  get(planId: string): Promise<ProtectionPlan | null>;
  save(plan: ProtectionPlan): Promise<void>;
}

export interface ProtectionDecisionStore {
  get(decisionId: string): Promise<ExplainableProtectionDecision | null>;
  save(decision: ExplainableProtectionDecision): Promise<void>;
}

export interface ProtectionControlDependencies {
  planStore: ProtectionPlanStore;
  decisionStore: ProtectionDecisionStore;
  evaluatePolicy: (context: AdaptiveProtectionContext) => Promise<Phase10PolicyDecision>;
  evaluateBusinessRule: (context: AdaptiveProtectionContext) => Promise<Phase10BusinessRuleResult>;
  appendAudit: (event: string, metadata: Record<string, unknown>) => Promise<void>;
  appendTimeline: (message: string) => Promise<void>;
  appendEvidence: (metadataHash: string, metadata: Record<string, unknown>) => Promise<void>;
  emitDomainEvent: (eventType: string, metadata: Record<string, unknown>) => Promise<void>;
  workflowHook: (commandName: string, metadata: Record<string, unknown>) => Promise<void>;
  orchestratorHook: (commandName: string, metadata: Record<string, unknown>) => Promise<void>;
  resolveRuleDecisionReference?: (input: ProtectionRuleResolutionInput) => Promise<ResolvedRuleDecisionReference>;
}

export function createInMemoryProtectionPlanStore(initial: ProtectionPlan[] = []): ProtectionPlanStore {
  const map = new Map(initial.map((plan) => [plan.planId, plan]));
  return {
    async get(planId) {
      return map.get(planId) ?? null;
    },
    async save(plan) {
      map.set(plan.planId, plan);
    },
  };
}

export function createInMemoryProtectionDecisionStore(initial: ExplainableProtectionDecision[] = []): ProtectionDecisionStore {
  const map = new Map(initial.map((decision) => [decision.decisionId, decision]));
  return {
    async get(decisionId) {
      return map.get(decisionId) ?? null;
    },
    async save(decision) {
      map.set(decision.decisionId, decision);
    },
  };
}

function hashMetadata(metadata: Record<string, unknown>): string {
  return `mdh:${Buffer.from(JSON.stringify(metadata)).toString("base64").slice(0, 24)}`;
}

function assertStaff(context: AdaptiveProtectionContext): void {
  if (context.actorRole !== "prime_global_staff") {
    throw new Error("unauthorized_staff_action");
  }
}

function assertOrganizationScope(plan: ProtectionPlan, context: AdaptiveProtectionContext): void {
  if (plan.organizationScope === "unknown") return;
  if (plan.organizationScope !== context.organizationScope) {
    throw new Error("cross_organization_denied");
  }
}

function createResolutionInput(command: {
  fieldCategory: DisclosureFieldCategory;
  context: AdaptiveProtectionContext;
}): ProtectionRuleResolutionInput {
  return {
    findingType: null,
    fieldCategory: command.fieldCategory,
    workflowStage: command.context.recruitmentWorkflowStage,
    actorRole: command.context.actorRole,
    organizationId: command.context.organizationScope,
    tenantId: command.context.tenantScope,
    policyVersion: command.context.policyVersion,
    consentVersion: command.context.candidateConsentVersion,
    employerVerificationStatus: command.context.employerVerificationStatus,
    interviewStatus: command.context.interviewStatus,
    paymentStatus: command.context.paymentStatus,
    contractState: command.context.contractState,
    freezeState: command.context.activeFreezeState,
    criticalViolationState: command.context.activeCriticalViolationState,
    evaluationTimestamp: new Date().toISOString(),
  };
}

export async function evaluateProtectionLevelCommand(
  command: EvaluateProtectionLevelCommand,
  dependencies: ProtectionControlDependencies
): Promise<{ protectionLevel: string; manifest: DisclosureManifest }> {
  const plan = await dependencies.planStore.get(command.planId);
  if (!plan) throw new Error("protection_plan_not_found");
  assertOrganizationScope(plan, command.context);

  await dependencies.workflowHook("EvaluateProtectionLevelCommand", { planId: command.planId });
  await dependencies.orchestratorHook("EvaluateProtectionLevelCommand", { planId: command.planId });

  const policyDecision = await dependencies.evaluatePolicy(command.context);
  const ruleDecision = await dependencies.evaluateBusinessRule(command.context);

  const protectionLevel = policyDecision.allowed && ruleDecision.allowed ? evaluateAdaptiveProtectionLevel(command.context) : "strict_private";
  const manifest = createDisclosureManifest(protectionLevel);

  plan.currentDisclosureManifest = manifest;
  plan.policyVersion = command.context.policyVersion;
  plan.workflowStageRequirement = command.context.recruitmentWorkflowStage;

  await dependencies.planStore.save(plan);
  await dependencies.emitDomainEvent("ProtectionLevelEvaluated", { planId: plan.planId, protectionLevel });
  await dependencies.emitDomainEvent("DisclosureManifestCreated", { planId: plan.planId, manifestId: manifest.manifestId });
  await dependencies.appendAudit("policy_evaluation", {
    planId: plan.planId,
    protectionLevel,
    policyAllowed: policyDecision.allowed,
    businessRuleAllowed: ruleDecision.allowed,
  });
  await dependencies.appendEvidence(hashMetadata({ planId: plan.planId, protectionLevel }), {
    decision: "protection_level_evaluated",
    planId: plan.planId,
    protectionLevel,
  });

  return { protectionLevel, manifest };
}

export async function requestFieldRevealCommand(
  command: RequestFieldRevealCommand,
  dependencies: ProtectionControlDependencies
): Promise<ExplainableProtectionDecision> {
  const plan = await dependencies.planStore.get(command.planId);
  if (!plan) throw new Error("protection_plan_not_found");
  assertOrganizationScope(plan, command.context);

  await dependencies.workflowHook("RequestFieldRevealCommand", { planId: plan.planId, fieldCategory: command.fieldCategory });

  const current = plan.currentDisclosureManifest.fields.find((field) => field.fieldCategory === command.fieldCategory);
  if (!current) throw new Error("field_not_found");

  const transition = transitionDisclosureState({
    fieldCategory: command.fieldCategory,
    fromState: current.disclosureState,
    toState: "revealed",
    context: command.context,
    policyId: "PG-CONTRACT-REVEAL-001",
    ruleId: "PG-CONTRACT-REVEAL-001",
    actorId: command.requestedByActorId,
  });

  if (dependencies.resolveRuleDecisionReference) {
    transition.decision.ruleDecisionReference = await dependencies.resolveRuleDecisionReference(
      createResolutionInput({
        fieldCategory: command.fieldCategory,
        context: command.context,
      })
    );
  }

  const decision = transition.decision;
  await dependencies.decisionStore.save(decision);
  await dependencies.emitDomainEvent("FieldRevealRequested", {
    planId: plan.planId,
    fieldCategory: command.fieldCategory,
    allowed: transition.allowed,
  });
  await dependencies.appendAudit("reveal_request", {
    planId: plan.planId,
    fieldCategory: command.fieldCategory,
    allowed: transition.allowed,
    reason: command.reason,
  });
  await dependencies.appendEvidence(
    hashMetadata({ planId: plan.planId, fieldCategory: command.fieldCategory, allowed: transition.allowed }),
    {
      decisionId: decision.decisionId,
      planId: plan.planId,
      fieldCategory: command.fieldCategory,
    }
  );

  if (!transition.allowed) {
    await dependencies.emitDomainEvent("FieldRevealDenied", {
      planId: plan.planId,
      fieldCategory: command.fieldCategory,
      reasonCode: decision.reasonCode,
    });
  }

  return decision;
}

export async function approveFieldRevealCommand(
  command: ApproveFieldRevealCommand,
  dependencies: ProtectionControlDependencies
): Promise<ProtectionPlan> {
  assertStaff(command.context);

  const plan = await dependencies.planStore.get(command.planId);
  if (!plan) throw new Error("protection_plan_not_found");
  assertOrganizationScope(plan, command.context);

  const current = plan.currentDisclosureManifest.fields.find((field) => field.fieldCategory === command.fieldCategory);
  if (!current) throw new Error("field_not_found");

  const transition = transitionDisclosureState({
    fieldCategory: command.fieldCategory,
    fromState: current.disclosureState,
    toState: "revealed",
    context: command.context,
    policyId: "PG-CONTRACT-REVEAL-001",
    ruleId: "PG-CONTRACT-REVEAL-001",
    actorId: command.approvedByStaffId,
  });

  if (dependencies.resolveRuleDecisionReference) {
    transition.decision.ruleDecisionReference = await dependencies.resolveRuleDecisionReference(
      createResolutionInput({
        fieldCategory: command.fieldCategory,
        context: command.context,
      })
    );
  }

  if (!transition.allowed) {
    await dependencies.emitDomainEvent("FieldRevealDenied", {
      planId: plan.planId,
      fieldCategory: command.fieldCategory,
      reasonCode: transition.decision.reasonCode,
    });
    throw new Error(transition.errorCode ?? "reveal_denied");
  }

  plan.currentDisclosureManifest = updateManifestField(
    plan.currentDisclosureManifest,
    command.fieldCategory,
    transition.resultingState,
    command.justification
  );
  plan.transitionHistory = [
    ...plan.transitionHistory,
    {
      transitionId: `transition:${Math.random().toString(36).slice(2, 11)}`,
      fieldCategory: command.fieldCategory,
      from: current.disclosureState,
      to: transition.resultingState,
      approvedBy: command.approvedByStaffId,
      reasonCode: transition.decision.reasonCode,
      createdAt: new Date().toISOString(),
    },
  ];
  plan.rollbackTarget = updateManifestField(plan.currentDisclosureManifest, command.fieldCategory, current.disclosureState, "rollback target");

  await dependencies.planStore.save(plan);
  await dependencies.decisionStore.save(transition.decision);
  await dependencies.appendAudit("reveal_approval", {
    planId: plan.planId,
    fieldCategory: command.fieldCategory,
    approvedBy: command.approvedByStaffId,
  });
  await dependencies.emitDomainEvent("FieldRevealApproved", { planId: plan.planId, fieldCategory: command.fieldCategory });
  await dependencies.emitDomainEvent("DisclosureStateChanged", {
    planId: plan.planId,
    fieldCategory: command.fieldCategory,
    to: transition.resultingState,
  });
  await dependencies.appendTimeline("Professional details were updated with approved privacy controls.");

  return plan;
}

export async function revokeFieldRevealCommand(
  command: RevokeFieldRevealCommand,
  dependencies: ProtectionControlDependencies
): Promise<ProtectionPlan> {
  assertStaff(command.context);

  const plan = await dependencies.planStore.get(command.planId);
  if (!plan) throw new Error("protection_plan_not_found");
  assertOrganizationScope(plan, command.context);

  const current = plan.currentDisclosureManifest.fields.find((field) => field.fieldCategory === command.fieldCategory);
  if (!current) throw new Error("field_not_found");

  const transition = transitionDisclosureState({
    fieldCategory: command.fieldCategory,
    fromState: current.disclosureState,
    toState: "masked",
    context: command.context,
    policyId: "PG-ID-DOCUMENT-001",
    ruleId: "PG-ID-DOCUMENT-001",
    actorId: command.revokedByStaffId,
  });

  if (dependencies.resolveRuleDecisionReference) {
    transition.decision.ruleDecisionReference = await dependencies.resolveRuleDecisionReference(
      createResolutionInput({
        fieldCategory: command.fieldCategory,
        context: command.context,
      })
    );
  }

  if (!transition.allowed) throw new Error(transition.errorCode ?? "revoke_denied");

  plan.currentDisclosureManifest = updateManifestField(
    plan.currentDisclosureManifest,
    command.fieldCategory,
    transition.resultingState,
    command.reason
  );
  plan.revocationTimestamp = new Date().toISOString();

  await dependencies.planStore.save(plan);
  await dependencies.decisionStore.save(transition.decision);
  await dependencies.emitDomainEvent("FieldRevealRevoked", { planId: plan.planId, fieldCategory: command.fieldCategory });
  await dependencies.appendAudit("reveal_revocation", {
    planId: plan.planId,
    fieldCategory: command.fieldCategory,
    revokedBy: command.revokedByStaffId,
  });

  return plan;
}

export async function getDisclosureManifestQuery(
  query: GetDisclosureManifestQuery,
  dependencies: ProtectionControlDependencies
): Promise<DisclosureManifest> {
  const plan = await dependencies.planStore.get(query.planId);
  if (!plan) throw new Error("protection_plan_not_found");
  return plan.currentDisclosureManifest;
}

export async function getProtectionDecisionExplanationQuery(
  query: GetProtectionDecisionExplanationQuery,
  dependencies: ProtectionControlDependencies
): Promise<ExplainableProtectionDecision> {
  const decision = await dependencies.decisionStore.get(query.decisionId);
  if (!decision) throw new Error("decision_not_found");
  return decision;
}

export async function getEmployerSafeProjectionForPlan(
  planId: string,
  analysisId: string,
  dependencies: ProtectionControlDependencies
) {
  const plan = await dependencies.planStore.get(planId);
  if (!plan) throw new Error("protection_plan_not_found");
  return toEmployerSafeDisclosureProjection(analysisId, plan.currentDisclosureManifest);
}

export function createNoopProtectionControlDependencies(planStore: ProtectionPlanStore): ProtectionControlDependencies {
  const decisionStore = createInMemoryProtectionDecisionStore();
  return {
    planStore,
    decisionStore,
    async evaluatePolicy() {
      return {
        allowed: true,
        matchedPolicies: [],
        blockingReasons: [],
        requiredNextActions: [],
        explanation: "Policy adapter accepted by default.",
      };
    },
    async evaluateBusinessRule() {
      return {
        ruleName: "stage8.5.default",
        version: "1.0.0",
        allowed: true,
        passedConditions: [],
        failedConditions: [],
        blockingReasons: [],
        requiredNextActions: [],
        explanation: "Business rule adapter accepted by default.",
        context: {
          actorId: null,
          actorRole: "system",
          action: "stage8.5.default",
          organization: createPhase10OrganizationContext(),
          subjectId: null,
          subjectType: null,
          facts: {},
        },
      };
    },
    async appendAudit() {},
    async appendTimeline() {},
    async appendEvidence() {},
    async emitDomainEvent() {},
    async workflowHook() {},
    async orchestratorHook() {},
    async resolveRuleDecisionReference() {
      return {
        ruleId: "PG-STRICT-PRIVACY-FALLBACK",
        ruleVersion: "1.0.0",
        registryVersion: "stage8_75.stub.v1",
        policyIds: ["phase10.protection.level.evaluate"],
        businessRuleIds: ["Unlock Contract"],
        ruleSnapshotHash: "stub",
        resolutionTimestamp: new Date().toISOString(),
        effectiveDateUsed: new Date().toISOString(),
        fallbackApplied: true,
        deprecatedRuleWarning: false,
        humanReviewRequirement: true,
      };
    },
  };
}
