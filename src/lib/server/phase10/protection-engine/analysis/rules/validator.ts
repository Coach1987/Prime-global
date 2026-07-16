import type { ProtectionRule, ProtectionRuleValidationIssue, ProtectionRuleValidationResult } from "./types.ts";

const RULE_ID_PATTERN = /^PG-[A-Z-]+-\d{3}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const BANNED_CANDIDATE_WORDS = ["violation", "detector", "ocr", "qr", "confidence score", "policy id", "rule id"];

function issue(code: string, message: string, field: string): ProtectionRuleValidationIssue {
  return { code, message, field };
}

function hasConflict<T extends string>(left: T[], right: T[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

export class ProtectionRuleValidator {
  validate(rule: ProtectionRule): ProtectionRuleValidationResult {
    const issues: ProtectionRuleValidationIssue[] = [];

    if (!RULE_ID_PATTERN.test(rule.ruleId)) {
      issues.push(issue("invalid_rule_id", "Rule ID must follow PG-KEY-001 format.", "ruleId"));
    }

    if (!SEMVER_PATTERN.test(rule.ruleVersion)) {
      issues.push(issue("invalid_semver", "Rule version must use semantic versioning.", "ruleVersion"));
    }

    if (!rule.allowedDisclosureStates.length) {
      issues.push(issue("empty_allowed_states", "At least one allowed disclosure state is required.", "allowedDisclosureStates"));
    }

    if (hasConflict(rule.allowedDisclosureStates, rule.forbiddenDisclosureStates)) {
      issues.push(
        issue(
          "state_conflict",
          "Allowed and forbidden disclosure states cannot overlap.",
          "allowedDisclosureStates/forbiddenDisclosureStates"
        )
      );
    }

    if (rule.immutablePrivacy && rule.allowedDisclosureStates.includes("revealed")) {
      issues.push(issue("immutable_reveal_forbidden", "Immutable privacy rules cannot allow revealed state.", "allowedDisclosureStates"));
    }

    if (rule.fieldCategories.includes("original_cv") && rule.allowedDisclosureStates.includes("revealed")) {
      issues.push(issue("original_cv_reveal_forbidden", "Original CV can never be revealed.", "fieldCategories"));
    }

    if (rule.fieldCategories.includes("private_documents") && rule.allowedDisclosureStates.includes("revealed")) {
      issues.push(issue("private_documents_reveal_forbidden", "Private documents can never be revealed.", "fieldCategories"));
    }

    if (!rule.policyEnginePolicyIds.length) {
      issues.push(issue("missing_policy_link", "At least one policy link is required.", "policyEnginePolicyIds"));
    }

    if (!rule.businessRuleIds.length) {
      issues.push(issue("missing_business_rule_link", "At least one business rule link is required.", "businessRuleIds"));
    }

    if (!rule.workflowStageConstraints.length) {
      issues.push(issue("missing_workflow_constraints", "Workflow stage constraints are required.", "workflowStageConstraints"));
    }

    if (!rule.actorRoleConstraints.length) {
      issues.push(issue("missing_role_constraints", "Actor role constraints are required.", "actorRoleConstraints"));
    }

    if (rule.effectiveUntil && new Date(rule.effectiveUntil).getTime() <= new Date(rule.effectiveFrom).getTime()) {
      issues.push(issue("invalid_effective_window", "effectiveUntil must be after effectiveFrom.", "effectiveUntil"));
    }

    if (rule.deprecated && !rule.replacementRuleId) {
      issues.push(issue("missing_replacement", "Deprecated rules should include replacementRuleId.", "replacementRuleId"));
    }

    if (BANNED_CANDIDATE_WORDS.some((word) => rule.candidateFriendlyExplanation.toLowerCase().includes(word))) {
      issues.push(issue("candidate_wording_violation", "Candidate wording must remain simple and non-technical.", "candidateFriendlyExplanation"));
    }

    if (rule.metadata && ("originalObjectReference" in rule.metadata || "privateDocumentPath" in rule.metadata)) {
      issues.push(issue("private_reference_forbidden", "Rule metadata must not include private file references.", "metadata"));
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
