import type { WorkflowActorContext, WorkflowState, WorkflowStateName, WorkflowType } from "../types/index.ts";

export interface WorkflowTransitionGuardInput {
  actor: WorkflowActorContext;
  metadata: Record<string, unknown>;
}

export interface WorkflowTransitionGuardResult {
  allowed: boolean;
  explanation: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  overrideAllowed: boolean;
}

export interface WorkflowTransitionDefinition {
  from: WorkflowStateName;
  to: WorkflowStateName;
  reversible: boolean;
  terminal: boolean;
  guard: (input: WorkflowTransitionGuardInput) => WorkflowTransitionGuardResult;
}

export interface WorkflowStateMachineDefinition {
  workflowType: WorkflowType;
  initialState: WorkflowStateName;
  terminalStates: WorkflowStateName[];
  transitions: WorkflowTransitionDefinition[];
}

export interface WorkflowTransitionRequest {
  workflowType: WorkflowType;
  workflowId: string;
  currentState: WorkflowStateName;
  toState: WorkflowStateName;
  actor: WorkflowActorContext;
  expectedVersion?: number;
  currentVersion: number;
  metadata?: Record<string, unknown>;
  staffOverrideReason?: string | null;
  timestamp?: string;
}

export interface WorkflowTransitionResult {
  success: boolean;
  workflowId: string;
  workflowType: WorkflowType;
  previousState: WorkflowStateName;
  currentState: WorkflowStateName;
  previousVersion: number;
  currentVersion: number;
  explanation: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  reversible: boolean;
  terminal: boolean;
  timestamp: string;
}

function passGuard(): WorkflowTransitionGuardResult {
  return {
    allowed: true,
    explanation: "Transition guard passed.",
    blockingReasons: [],
    requiredNextActions: [],
    overrideAllowed: false,
  };
}

export function createWorkflowStateMachineDefinition(workflowType: WorkflowType, initialState: WorkflowStateName): WorkflowStateMachineDefinition {
  return {
    workflowType,
    initialState,
    terminalStates: [],
    transitions: [],
  };
}

export const workflowStateMachineDefinitions: Record<WorkflowType, WorkflowStateMachineDefinition> = {
  candidate_selection: {
    workflowType: "candidate_selection",
    initialState: "draft",
    terminalStates: ["selected", "cancelled"],
    transitions: [
      { from: "draft", to: "selected", reversible: false, terminal: true, guard: passGuard },
      { from: "draft", to: "cancelled", reversible: true, terminal: true, guard: passGuard },
    ],
  },
  interview: {
    workflowType: "interview",
    initialState: "requested",
    terminalStates: ["completed", "cancelled"],
    transitions: [
      { from: "requested", to: "accepted", reversible: true, terminal: false, guard: passGuard },
      { from: "accepted", to: "active", reversible: false, terminal: false, guard: passGuard },
      { from: "active", to: "started", reversible: false, terminal: false, guard: passGuard },
      { from: "started", to: "completed", reversible: false, terminal: true, guard: passGuard },
      { from: "requested", to: "cancelled", reversible: true, terminal: true, guard: passGuard },
    ],
  },
  offer: {
    workflowType: "offer",
    initialState: "draft",
    terminalStates: ["accepted", "declined"],
    transitions: [{ from: "draft", to: "accepted", reversible: false, terminal: true, guard: passGuard }],
  },
  hiring: {
    workflowType: "hiring",
    initialState: "pending",
    terminalStates: ["hired", "rejected"],
    transitions: [{ from: "pending", to: "hired", reversible: false, terminal: true, guard: passGuard }],
  },
  payment: {
    workflowType: "payment",
    initialState: "pending",
    terminalStates: ["verified", "failed"],
    transitions: [{ from: "pending", to: "verified", reversible: false, terminal: true, guard: passGuard }],
  },
  contract: {
    workflowType: "contract",
    initialState: "locked",
    terminalStates: ["unlocked"],
    transitions: [{ from: "locked", to: "unlocked", reversible: false, terminal: true, guard: passGuard }],
  },
  appeal: {
    workflowType: "appeal",
    initialState: "submitted",
    terminalStates: ["resolved", "rejected"],
    transitions: [{ from: "submitted", to: "resolved", reversible: false, terminal: true, guard: passGuard }],
  },
  violation: {
    workflowType: "violation",
    initialState: "open",
    terminalStates: ["resolved", "escalated"],
    transitions: [{ from: "open", to: "resolved", reversible: false, terminal: true, guard: passGuard }],
  },
};

export function createInitialWorkflowState(workflowType: WorkflowType, workflowId: string): WorkflowState {
  const definition = workflowStateMachineDefinitions[workflowType];
  return {
    workflowType,
    workflowId,
    currentState: definition.initialState,
    version: 0,
    metadata: {},
    updatedAt: new Date().toISOString(),
  };
}

export function applyWorkflowTransition(
  definition: WorkflowStateMachineDefinition,
  request: WorkflowTransitionRequest
): WorkflowTransitionResult {
  const transition = definition.transitions.find((entry) => entry.from === request.currentState && entry.to === request.toState);

  if (!transition) {
    return {
      success: false,
      workflowId: request.workflowId,
      workflowType: request.workflowType,
      previousState: request.currentState,
      currentState: request.currentState,
      previousVersion: request.currentVersion,
      currentVersion: request.currentVersion,
      explanation: `Transition ${request.currentState} -> ${request.toState} is not allowed for ${request.workflowType}.`,
      blockingReasons: ["invalid_transition"],
      requiredNextActions: ["Use one of the allowed transitions for this workflow type."],
      reversible: false,
      terminal: false,
      timestamp: request.timestamp ?? new Date().toISOString(),
    };
  }

  if (typeof request.expectedVersion === "number" && request.expectedVersion !== request.currentVersion) {
    return {
      success: false,
      workflowId: request.workflowId,
      workflowType: request.workflowType,
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

  const guard = transition.guard({
    actor: request.actor,
    metadata: {
      ...(request.metadata ?? {}),
      staffOverrideReason: request.staffOverrideReason ?? null,
    },
  });

  if (!guard.allowed && !(guard.overrideAllowed && request.staffOverrideReason)) {
    return {
      success: false,
      workflowId: request.workflowId,
      workflowType: request.workflowType,
      previousState: request.currentState,
      currentState: request.currentState,
      previousVersion: request.currentVersion,
      currentVersion: request.currentVersion,
      explanation: guard.explanation,
      blockingReasons: guard.blockingReasons,
      requiredNextActions: guard.requiredNextActions,
      reversible: transition.reversible,
      terminal: transition.terminal,
      timestamp: request.timestamp ?? new Date().toISOString(),
    };
  }

  return {
    success: true,
    workflowId: request.workflowId,
    workflowType: request.workflowType,
    previousState: request.currentState,
    currentState: transition.to,
    previousVersion: request.currentVersion,
    currentVersion: request.currentVersion + 1,
    explanation: request.staffOverrideReason
      ? `Transition approved with staff override: ${request.staffOverrideReason}`
      : guard.explanation,
    blockingReasons: [],
    requiredNextActions: [],
    reversible: transition.reversible,
    terminal: transition.terminal,
    timestamp: request.timestamp ?? new Date().toISOString(),
  };
}
