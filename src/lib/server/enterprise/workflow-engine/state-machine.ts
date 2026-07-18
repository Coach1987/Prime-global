import { evaluateWorkflowRule } from "./rules.ts";
import type {
  WorkflowApprovalMode,
  WorkflowStateMachineDefinition,
  WorkflowStateName,
  WorkflowTransitionDefinition,
  WorkflowTransitionGuardInput,
  WorkflowTransitionGuardResult,
  WorkflowTransitionRequest,
  WorkflowTransitionResult,
} from "./types.ts";

export const WORKFLOW_STATE_NAMES: WorkflowStateName[] = [
  "draft",
  "pending",
  "in_review",
  "waiting_higher_approval",
  "approved",
  "rejected",
  "returned",
  "cancelled",
  "expired",
  "executed",
  "archived",
];

export const WORKFLOW_APPROVAL_MODES: WorkflowApprovalMode[] = [
  "single",
  "sequential",
  "parallel",
  "conditional",
  "owner_final",
  "authority_level",
  "financial",
  "minimum_authority",
  "ai_advisory",
];

export function createWorkflowStateMachineDefinition(
  workflowTypeCode: string,
  initialState: WorkflowStateName,
  transitions: WorkflowTransitionDefinition[],
  terminalStates: WorkflowStateName[] = []
): WorkflowStateMachineDefinition {
  return {
    workflowTypeCode,
    initialState,
    terminalStates,
    transitions,
  };
}

export function evaluateWorkflowTransitionGuard(input: WorkflowTransitionGuardInput): WorkflowTransitionGuardResult {
  return {
    allowed: true,
    explanation: `${input.currentState} -> ${input.targetState} is permitted for ${input.workflowTypeCode}.`,
    blockingReasons: [],
    requiredNextActions: [],
  };
}

export function evaluateWorkflowTransition(
  definition: WorkflowStateMachineDefinition,
  request: WorkflowTransitionRequest
): WorkflowTransitionResult {
  const transition = definition.transitions.find((entry) => entry.from === request.currentState && entry.to === request.targetState);

  if (!transition) {
    return {
      success: false,
      workflowTypeCode: request.workflowTypeCode,
      previousState: request.currentState,
      currentState: request.currentState,
      previousVersion: request.currentVersion ?? 0,
      currentVersion: request.currentVersion ?? 0,
      explanation: `Transition ${request.currentState} -> ${request.targetState} is not configured for ${request.workflowTypeCode}.`,
      blockingReasons: ["invalid_transition"],
      requiredNextActions: ["Update the workflow definition with an allowed transition."],
      reversible: false,
      terminal: false,
      timestamp: request.timestamp ?? new Date().toISOString(),
    };
  }

  if (typeof request.expectedVersion === "number" && typeof request.currentVersion === "number" && request.expectedVersion !== request.currentVersion) {
    return {
      success: false,
      workflowTypeCode: request.workflowTypeCode,
      previousState: request.currentState,
      currentState: request.currentState,
      previousVersion: request.currentVersion,
      currentVersion: request.currentVersion,
      explanation: "Expected workflow version does not match the current stored version.",
      blockingReasons: ["optimistic_concurrency_conflict"],
      requiredNextActions: ["Reload the current workflow state and retry with the latest version."],
      reversible: transition.reversible,
      terminal: transition.terminal,
      timestamp: request.timestamp ?? new Date().toISOString(),
    };
  }

  const ruleResult = transition.condition ? evaluateWorkflowRule(transition.condition, request.ruleContext) : null;
  if (ruleResult && !ruleResult.matched) {
    return {
      success: false,
      workflowTypeCode: request.workflowTypeCode,
      previousState: request.currentState,
      currentState: request.currentState,
      previousVersion: request.currentVersion ?? 0,
      currentVersion: request.currentVersion ?? 0,
      explanation: ruleResult.reason,
      blockingReasons: ruleResult.failedConditions.length > 0 ? ruleResult.failedConditions : ["transition_guard_blocked"],
      requiredNextActions: ["Adjust the workflow rule conditions or the input context."],
      reversible: transition.reversible,
      terminal: transition.terminal,
      timestamp: request.timestamp ?? new Date().toISOString(),
    };
  }

  const guardResult = evaluateWorkflowTransitionGuard({
    workflowTypeCode: request.workflowTypeCode,
    currentState: request.currentState,
    targetState: request.targetState,
    approvalMode: request.approvalMode ?? null,
    ruleContext: request.ruleContext,
  });

  const nextVersion = (request.currentVersion ?? 0) + 1;

  return {
    success: true,
    workflowTypeCode: request.workflowTypeCode,
    previousState: request.currentState,
    currentState: request.targetState,
    previousVersion: request.currentVersion ?? 0,
    currentVersion: nextVersion,
    explanation: ruleResult?.reason ?? guardResult.explanation,
    blockingReasons: [],
    requiredNextActions: [],
    reversible: transition.reversible,
    terminal: transition.terminal || definition.terminalStates.includes(request.targetState),
    timestamp: request.timestamp ?? new Date().toISOString(),
  };
}
