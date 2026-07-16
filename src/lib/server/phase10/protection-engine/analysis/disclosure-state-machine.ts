import type { AdaptiveProtectionContext, DisclosureFieldCategory, DisclosureState, ExplainableProtectionDecision } from "./types.ts";
import { createExplainableProtectionDecision, getFieldDefaultDisclosureState } from "./adaptive-protection.ts";

const ALLOWED_TRANSITIONS: Array<{ from: DisclosureState; to: DisclosureState }> = [
  { from: "hidden", to: "masked" },
  { from: "masked", to: "summarized" },
  { from: "summarized", to: "protected_placeholder" },
  { from: "protected_placeholder", to: "revealed" },
  { from: "revealed", to: "masked" },
  { from: "masked", to: "hidden" },
];

export interface DisclosureTransitionResult {
  allowed: boolean;
  resultingState: DisclosureState;
  errorCode: string | null;
  errorMessage: string | null;
  decision: ExplainableProtectionDecision;
}

function immutableEmployerHidden(field: DisclosureFieldCategory): boolean {
  return (
    field === "original_cv" ||
    field === "private_documents" ||
    field === "passport_number" ||
    field === "national_id" ||
    field === "precise_address"
  );
}

function allowedTransition(from: DisclosureState, to: DisclosureState): boolean {
  return ALLOWED_TRANSITIONS.some((transition) => transition.from === from && transition.to === to);
}

export function transitionDisclosureState(input: {
  fieldCategory: DisclosureFieldCategory;
  fromState?: DisclosureState;
  toState: DisclosureState;
  context: AdaptiveProtectionContext;
  policyId: string;
  ruleId: string;
  actorId: string;
}): DisclosureTransitionResult {
  const fromState = input.fromState ?? getFieldDefaultDisclosureState(input.fieldCategory);

  if (immutableEmployerHidden(input.fieldCategory) && input.toState === "revealed") {
    return {
      allowed: false,
      resultingState: fromState,
      errorCode: "immutable_field_reveal_denied",
      errorMessage: "Original CV and private documents are immutable employer-hidden fields.",
      decision: createExplainableProtectionDecision({
        context: input.context,
        policyId: input.policyId,
        ruleId: input.ruleId,
        fieldOrFindingCategory: input.fieldCategory,
        previousDisclosureState: fromState,
        resultingDisclosureState: fromState,
        reasonCode: "IMMUTABLE_PRIVACY_RESTRICTION",
        internalExplanation: "Immutable privacy field cannot transition to revealed.",
        employerFriendlyExplanation: "This field is intentionally unavailable for employer view.",
        decisionOrigin: "policy_engine",
      }),
    };
  }

  if (!allowedTransition(fromState, input.toState)) {
    return {
      allowed: false,
      resultingState: fromState,
      errorCode: "invalid_disclosure_transition",
      errorMessage: `Transition ${fromState} -> ${input.toState} is not permitted.`,
      decision: createExplainableProtectionDecision({
        context: input.context,
        policyId: input.policyId,
        ruleId: input.ruleId,
        fieldOrFindingCategory: input.fieldCategory,
        previousDisclosureState: fromState,
        resultingDisclosureState: fromState,
        reasonCode: "INVALID_TRANSITION",
        internalExplanation: `Invalid transition requested for ${input.fieldCategory}.`,
        employerFriendlyExplanation: "Requested disclosure change is not allowed at this stage.",
        decisionOrigin: "workflow_kernel",
      }),
    };
  }

  if (input.context.activeFreezeState || input.context.activeCriticalViolationState) {
    return {
      allowed: false,
      resultingState: fromState,
      errorCode: "reveal_blocked_by_protection_state",
      errorMessage: "Reveal transitions are blocked while freeze or critical violation is active.",
      decision: createExplainableProtectionDecision({
        context: input.context,
        policyId: input.policyId,
        ruleId: input.ruleId,
        fieldOrFindingCategory: input.fieldCategory,
        previousDisclosureState: fromState,
        resultingDisclosureState: fromState,
        reasonCode: "FREEZE_OR_CRITICAL_BLOCK",
        internalExplanation: "System freeze/critical protection state blocks reveal transition.",
        employerFriendlyExplanation: "Reveal is temporarily unavailable while internal review safeguards are active.",
        decisionOrigin: "business_rule_engine",
      }),
    };
  }

  return {
    allowed: true,
    resultingState: input.toState,
    errorCode: null,
    errorMessage: null,
    decision: createExplainableProtectionDecision({
      context: input.context,
      policyId: input.policyId,
      ruleId: input.ruleId,
      fieldOrFindingCategory: input.fieldCategory,
      previousDisclosureState: fromState,
      resultingDisclosureState: input.toState,
      reasonCode: "TRANSITION_APPROVED",
      internalExplanation: `Transition ${fromState} -> ${input.toState} approved.`,
      employerFriendlyExplanation: "Professional details were updated according to policy controls.",
      decisionOrigin: "policy_engine",
    }),
  };
}
