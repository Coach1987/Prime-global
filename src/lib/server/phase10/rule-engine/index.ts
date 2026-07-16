import type { Phase10PolicyContext } from "../policy-engine/index.ts";
import type { Phase10BusinessRuleDefinition, Phase10BusinessRuleRequirement, Phase10BusinessRuleResult } from "./types.ts";

export const phase10BusinessRuleRegistry: Phase10BusinessRuleDefinition[] = [
  {
    name: "Activate Interview",
    version: "1.0.0",
    requires: [
      { key: "candidate_selected", label: "Candidate selected", check: (context) => Boolean(context.facts.candidateSelected), failureReason: "Candidate selection must be recorded before interview activation." },
      { key: "invitation_accepted", label: "Invitation accepted", check: (context) => Boolean(context.facts.invitationAccepted), failureReason: "The candidate must accept the invitation before interview activation." },
      { key: "terms_version_accepted", label: "Current coordination terms accepted", check: (context) => Boolean(context.facts.currentTermsAccepted), failureReason: "Both parties must accept the current coordination terms version." },
      { key: "prime_global_staff_approval", label: "Prime Global staff approval", check: (context) => Boolean(context.facts.staffApproval), failureReason: "Prime Global staff approval is required before activation." },
      { key: "no_active_freeze", label: "No active freeze", check: (context) => !context.facts.hasActiveFreeze, failureReason: "An active freeze must be cleared before activation." },
      { key: "room_feature_enabled", label: "Video room feature enabled", check: (context) => Boolean(context.facts.videoRoomsEnabled), failureReason: "The room feature must be enabled before activation." },
    ],
    nextActions: ["Record missing requirements", "Request Prime Global staff review", "Resolve the blocking policy first"],
  },
  {
    name: "Unlock Contract",
    version: "1.0.0",
    requires: [
      { key: "interview_completed", label: "Interview completed", check: (context) => Boolean(context.facts.interviewCompleted), failureReason: "The interview must be completed before the contract can unlock." },
      { key: "hiring_decision_recorded", label: "Hiring decision recorded", check: (context) => Boolean(context.facts.hiringDecisionRecorded), failureReason: "A hiring decision must be recorded inside Prime Global." },
      { key: "fee_confirmed", label: "Prime Global fee confirmed", check: (context) => Boolean(context.facts.serviceFeeConfirmed), failureReason: "Prime Global fee confirmation is required before unlock." },
      { key: "payment_verified", label: "Payment verified", check: (context) => Boolean(context.facts.paymentVerified), failureReason: "Payment verification is required before contract unlock." },
      { key: "no_critical_violation", label: "No active critical violation", check: (context) => !context.facts.hasActiveCriticalViolation, failureReason: "Active critical violations must be resolved before contract unlock." },
      { key: "staff_approval", label: "Authorized staff approval", check: (context) => Boolean(context.facts.staffApproval), failureReason: "Authorized Prime Global staff approval is required for contract unlock." },
    ],
    nextActions: ["Complete the hiring workflow", "Verify payment", "Resolve active violations", "Request staff approval"],
  },
];

export function evaluatePhase10BusinessRule(ruleName: string, context: Phase10PolicyContext, rules: Phase10BusinessRuleDefinition[] = phase10BusinessRuleRegistry): Phase10BusinessRuleResult {
  const rule = rules.find((item) => item.name === ruleName);
  if (!rule) {
    return {
      ruleName,
      version: "unknown",
      allowed: false,
      passedConditions: [],
      failedConditions: [],
      blockingReasons: [`Unknown business rule: ${ruleName}`],
      requiredNextActions: ["Register the rule before evaluation"],
      explanation: `No business rule named ${ruleName} exists in the registry.`,
      context,
    };
  }

  const requirements: Phase10BusinessRuleRequirement[] = rule.requires.map((requirement) => {
    const satisfied = requirement.check(context);
    return {
      key: requirement.key,
      label: requirement.label,
      satisfied,
      reason: satisfied ? "Requirement satisfied." : requirement.failureReason,
    };
  });

  const failedConditions = requirements.filter((requirement) => !requirement.satisfied);
  const allowed = failedConditions.length === 0;

  return {
    ruleName: rule.name,
    version: rule.version,
    allowed,
    passedConditions: requirements.filter((requirement) => requirement.satisfied),
    failedConditions,
    blockingReasons: failedConditions.map((requirement) => requirement.reason),
    requiredNextActions: allowed ? [] : rule.nextActions,
    explanation: allowed ? `${rule.name} requirements are satisfied.` : failedConditions.map((requirement) => requirement.reason).join(" "),
    context,
  };
}

export type {
  Phase10BusinessRuleDefinition,
  Phase10BusinessRuleRequirement,
  Phase10BusinessRuleResult,
} from "./types.ts";
