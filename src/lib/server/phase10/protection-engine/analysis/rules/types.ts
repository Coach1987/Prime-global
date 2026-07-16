import type {
  DisclosureFieldCategory,
  DisclosureState,
  ProtectionAction,
  ProtectionCategory,
  ProtectionFindingType,
  ProtectionLevel,
  RecruitmentWorkflowStage,
} from "../types.ts";

export type RuleLifecycleState = "draft" | "active" | "deprecated" | "scheduled" | "disabled";

export interface RevealPrerequisites {
  consentRequired: boolean;
  staffApprovalRequired: boolean;
  paymentRequired: boolean;
  contractStateRequired: "not_required" | "required" | "must_be_signed";
}

export interface RuleFalsePositiveHandling {
  allowCorrection: boolean;
  allowedOutcomes: Array<"confirmed" | "false_positive" | "ignored" | "manually_reviewed" | "policy_exception">;
}

export interface ProtectionRule {
  ruleId: string;
  stableRuleKey: string;
  ruleVersion: string;
  schemaVersion: string;
  lifecycleState: RuleLifecycleState;
  name: string;
  description: string;
  protectedDataCategory: ProtectionCategory;
  findingTypes: ProtectionFindingType[];
  fieldCategories: DisclosureFieldCategory[];
  defaultProtectionLevel: ProtectionLevel;
  defaultDisclosureState: DisclosureState;
  allowedDisclosureStates: DisclosureState[];
  forbiddenDisclosureStates: DisclosureState[];
  immutablePrivacy: boolean;
  candidateFriendlyExplanation: string;
  employerFriendlyExplanation: string;
  internalExplanation: string;
  reasonCode: string;
  defaultProtectionAction: ProtectionAction;
  allowedProtectionActions: ProtectionAction[];
  revealEligibility: boolean;
  revealPrerequisites: RevealPrerequisites;
  workflowStageConstraints: RecruitmentWorkflowStage[];
  actorRoleConstraints: Array<"candidate" | "employer" | "prime_global_staff" | "system">;
  organizationScope: string | "any";
  tenantScope: string | "any" | null;
  policyEnginePolicyIds: string[];
  businessRuleIds: string[];
  consentRequirements: string[];
  staffApprovalRequirements: boolean;
  paymentRequirements: "not_required" | "required";
  contractStateRequirements: "not_required" | "required" | "must_be_signed";
  freezeRestrictions: boolean;
  criticalViolationRestrictions: boolean;
  evidenceRequirements: boolean;
  auditRequirements: boolean;
  humanReviewRequirements: boolean;
  falsePositiveHandling: RuleFalsePositiveHandling;
  enabled: boolean;
  effectiveFrom: string;
  effectiveUntil: string | null;
  deprecated: boolean;
  replacementRuleId: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ProtectionRuleValidationIssue {
  code: string;
  message: string;
  field: string;
}

export interface ProtectionRuleValidationResult {
  valid: boolean;
  issues: ProtectionRuleValidationIssue[];
}

export interface ResolvedRuleDecisionReference {
  ruleId: string;
  ruleVersion: string;
  registryVersion: string;
  policyIds: string[];
  businessRuleIds: string[];
  ruleSnapshotHash: string;
  resolutionTimestamp: string;
  effectiveDateUsed: string;
  fallbackApplied: boolean;
  deprecatedRuleWarning: boolean;
  humanReviewRequirement: boolean;
}

export interface ProtectionRuleSnapshot {
  ruleId: string;
  stableRuleKey: string;
  ruleVersion: string;
  schemaVersion: string;
  reasonCode: string;
  defaultProtectionAction: ProtectionAction;
  allowedDisclosureStates: DisclosureState[];
  forbiddenDisclosureStates: DisclosureState[];
  policyEnginePolicyIds: string[];
  businessRuleIds: string[];
  hash: string;
}

export interface ProtectionRuleResolutionInput {
  findingType: ProtectionFindingType | null;
  fieldCategory: DisclosureFieldCategory | null;
  workflowStage: RecruitmentWorkflowStage;
  actorRole: "candidate" | "employer" | "prime_global_staff" | "system";
  organizationId: string;
  tenantId: string | null;
  policyVersion: string;
  consentVersion: string;
  employerVerificationStatus: "unverified" | "pending" | "verified";
  interviewStatus: "not_started" | "scheduled" | "in_progress" | "completed" | "cancelled";
  paymentStatus: "not_applicable" | "pending" | "verified" | "failed";
  contractState: "not_started" | "draft" | "review" | "signed" | "closed";
  freezeState: boolean;
  criticalViolationState: boolean;
  evaluationTimestamp: string;
}

export interface ProtectionRuleRejectionReason {
  ruleId: string;
  ruleVersion: string;
  reason: string;
}

export interface ProtectionRuleResolutionResult {
  selectedRuleId: string;
  selectedVersion: string;
  matchingReasons: string[];
  rejectedCandidateRules: ProtectionRuleRejectionReason[];
  policyLinks: string[];
  businessRuleLinks: string[];
  defaultProtectionAction: ProtectionAction;
  defaultDisclosureState: DisclosureState;
  revealEligibility: boolean;
  blockingReasons: string[];
  requiredNextActions: string[];
  humanReviewRequirement: boolean;
  explanation: string;
  fallbackRuleUsed: boolean;
  deprecatedRuleWarning: boolean;
}

export interface ProtectionRuleRegistry {
  getRuleById(ruleId: string, version?: string): ProtectionRule | null;
  listByCategory(category: ProtectionCategory): ProtectionRule[];
  listByFindingType(findingType: ProtectionFindingType): ProtectionRule[];
  listByWorkflowStage(stage: RecruitmentWorkflowStage): ProtectionRule[];
  listByActorRole(role: "candidate" | "employer" | "prime_global_staff" | "system"): ProtectionRule[];
  resolveActiveVersion(stableRuleKey: string, at: string): ProtectionRule | null;
  listEffectiveAt(at: string): ProtectionRule[];
  listByOrganizationScope(organizationId: string, tenantId: string | null): ProtectionRule[];
  getReplacementRule(ruleId: string): ProtectionRule | null;
  resolveDeprecatedRule(ruleId: string): { current: ProtectionRule | null; replacement: ProtectionRule | null };
  listRulesDeterministic(): ProtectionRule[];
  getHistory(stableRuleKey: string): ProtectionRule[];
}

export interface ProtectionRulesRegistryOptions {
  registryVersion: string;
  now?: string;
}
