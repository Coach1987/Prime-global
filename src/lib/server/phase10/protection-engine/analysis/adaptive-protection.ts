import { evaluatePhase10Policies } from "../../policy-engine/index.ts";
import { evaluatePhase10BusinessRule } from "../../rule-engine/index.ts";
import { createPhase10OrganizationContext } from "../../organization/index.ts";
import type {
  AdaptiveProtectionContext,
  DisclosureFieldCategory,
  DisclosureState,
  ExplainableProtectionDecision,
  ProtectionFindingType,
  ProtectionRuleDecisionReference,
  ProtectionLevel,
} from "./types.ts";
import type { ProtectionRuleResolver } from "./rules/resolver.ts";

export const CANDIDATE_FRIENDLY_PROTECTION_EXPLANATION =
  "Prime Global protects your personal information and shares only the professional details required at each stage.";

function nowIso(): string {
  return new Date().toISOString();
}

function baseStateForField(field: DisclosureFieldCategory): DisclosureState {
  if (field === "original_cv" || field === "private_documents" || field === "passport_number" || field === "national_id") {
    return "staff_only";
  }
  if (field === "personal_email" || field === "personal_phone" || field === "precise_address") {
    return "masked";
  }
  return "protected_placeholder";
}

function resolveDefaultProtectionLevel(context: AdaptiveProtectionContext): ProtectionLevel {
  if (context.activeFreezeState || context.activeCriticalViolationState) return "strict_private";
  if (context.contractState === "signed") return "contract_stage_limited_reveal";
  if (context.recruitmentWorkflowStage === "closed") return "closed_process";
  if (context.authorizedStaffOverride) return "staff_review";
  return "protected_recruitment";
}

export function evaluateAdaptiveProtectionLevel(context: AdaptiveProtectionContext): ProtectionLevel {
  const organization = createPhase10OrganizationContext({
    organizationId: context.organizationScope,
    tenantId: context.tenantScope,
  });

  const policy = evaluatePhase10Policies({
    actorRole: context.actorRole,
    action: "phase10.protection.level.evaluate",
    organization,
    facts: {
      workflowStage: context.recruitmentWorkflowStage,
      activeFreezeState: context.activeFreezeState,
      activeCriticalViolationState: context.activeCriticalViolationState,
      candidateConsentVersion: context.candidateConsentVersion,
      employerVerificationStatus: context.employerVerificationStatus,
      paymentStatus: context.paymentStatus,
      contractState: context.contractState,
    },
  });

  if (!policy.allowed && policy.blockingReasons.length > 0) return "strict_private";

  const rule = evaluatePhase10BusinessRule("Unlock Contract", {
    actorId: null,
    actorRole: context.actorRole,
    action: "phase10.protection.level.evaluate",
    organization,
    subjectId: null,
    subjectType: "candidate_profile",
    facts: {
      interviewCompleted: context.interviewStatus === "completed",
      serviceFeeConfirmed: context.paymentStatus === "verified",
      paymentVerified: context.paymentStatus === "verified",
      hasActiveCriticalViolation: context.activeCriticalViolationState,
      staffApproval: context.authorizedStaffOverride,
      hiringDecisionRecorded: context.contractState !== "not_started",
    },
  });

  if (!rule.allowed && context.paymentStatus === "pending") {
    return "strict_private";
  }

  return resolveDefaultProtectionLevel(context);
}

export function createExplainableProtectionDecision(input: {
  context: AdaptiveProtectionContext;
  policyId: string;
  ruleId: string;
  fieldOrFindingCategory: string;
  previousDisclosureState: DisclosureState;
  resultingDisclosureState: DisclosureState;
  reasonCode: string;
  internalExplanation: string;
  employerFriendlyExplanation: string;
  confidence?: number | null;
  humanReviewRequirement?: boolean;
  staffOverrideEligibility?: boolean;
  decisionOrigin?: ExplainableProtectionDecision["decisionOrigin"];
  ruleDecisionReference?: ProtectionRuleDecisionReference | null;
}): ExplainableProtectionDecision {
  const protectionLevel = evaluateAdaptiveProtectionLevel(input.context);

  return {
    decisionId: `decision:${Math.random().toString(36).slice(2, 12)}`,
    policyId: input.policyId,
    policyVersion: input.context.policyVersion,
    ruleId: input.ruleId,
    protectionLevel,
    fieldOrFindingCategory: input.fieldOrFindingCategory,
    previousDisclosureState: input.previousDisclosureState,
    resultingDisclosureState: input.resultingDisclosureState,
    reasonCode: input.reasonCode,
    internalExplanation: input.internalExplanation,
    candidateFriendlyExplanation: CANDIDATE_FRIENDLY_PROTECTION_EXPLANATION,
    employerFriendlyExplanation: input.employerFriendlyExplanation,
    evaluatedWorkflowStage: input.context.recruitmentWorkflowStage,
    evaluatedActorRole: input.context.actorRole,
    evaluatedOrganizationScope: input.context.organizationScope,
    evaluatedConsentVersion: input.context.candidateConsentVersion,
    evaluatedConditions: [
      `stage=${input.context.recruitmentWorkflowStage}`,
      `employerVerification=${input.context.employerVerificationStatus}`,
      `paymentStatus=${input.context.paymentStatus}`,
      `contractState=${input.context.contractState}`,
      `activeFreezeState=${input.context.activeFreezeState}`,
      `activeCriticalViolationState=${input.context.activeCriticalViolationState}`,
    ],
    passedConditions: [
      input.context.activeFreezeState ? "" : "no_active_freeze",
      input.context.activeCriticalViolationState ? "" : "no_active_critical_violation",
    ].filter(Boolean),
    failedConditions: [
      input.context.activeFreezeState ? "active_freeze" : "",
      input.context.activeCriticalViolationState ? "active_critical_violation" : "",
    ].filter(Boolean),
    blockingReasons: [
      input.context.activeFreezeState ? "Protection reveal blocked because an active freeze is present." : "",
      input.context.activeCriticalViolationState ? "Protection reveal blocked due to active critical violation." : "",
    ].filter(Boolean),
    requiredNextActions: [
      input.context.activeFreezeState ? "Resolve active freeze before reveal." : "",
      input.context.activeCriticalViolationState ? "Resolve active critical violation before reveal." : "",
    ].filter(Boolean),
    decisionOrigin: input.decisionOrigin ?? "system_default",
    confidence: input.confidence ?? null,
    humanReviewRequirement: input.humanReviewRequirement ?? protectionLevel === "staff_review",
    staffOverrideEligibility: input.staffOverrideEligibility ?? true,
    createdTimestamp: nowIso(),
    schemaVersion: "stage8_5.decision.v1",
    feedbackStatus: "confirmed",
    ruleDecisionReference: input.ruleDecisionReference ?? null,
  };
}

export function getFieldDefaultDisclosureState(field: DisclosureFieldCategory): DisclosureState {
  return baseStateForField(field);
}

export function evaluateAdaptiveProtectionLevelWithRules(input: {
  context: AdaptiveProtectionContext;
  resolver: ProtectionRuleResolver;
  fieldCategory: DisclosureFieldCategory;
  findingType: ProtectionFindingType | null;
}): { protectionLevel: ProtectionLevel; ruleDecisionReference: ProtectionRuleDecisionReference } {
  const resolution = input.resolver.resolve({
    findingType: input.findingType,
    fieldCategory: input.fieldCategory,
    workflowStage: input.context.recruitmentWorkflowStage,
    actorRole: input.context.actorRole,
    organizationId: input.context.organizationScope,
    tenantId: input.context.tenantScope,
    policyVersion: input.context.policyVersion,
    consentVersion: input.context.candidateConsentVersion,
    employerVerificationStatus: input.context.employerVerificationStatus,
    interviewStatus: input.context.interviewStatus,
    paymentStatus: input.context.paymentStatus,
    contractState: input.context.contractState,
    freezeState: input.context.activeFreezeState,
    criticalViolationState: input.context.activeCriticalViolationState,
    evaluationTimestamp: new Date().toISOString(),
  });

  const protectionLevel = resolution.fallbackRuleUsed ? "strict_private" : evaluateAdaptiveProtectionLevel(input.context);

  return {
    protectionLevel,
    ruleDecisionReference: input.resolver.createDecisionReference(resolution),
  };
}
