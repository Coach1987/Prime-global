import type { OrchestrationGraph } from "../graphs/index.ts";
import type { OrchestrationState, OrchestrationResult } from "../types/index.ts";
import type { OrchestrationUnitOfWork } from "../persistence/index.ts";
import { createOrchestratorError } from "../errors/index.ts";

export interface OrchestratorExecutionDependencies {
  flags: {
    RECRUITMENT_ORCHESTRATOR_ENABLED: boolean;
    ORCHESTRATION_SAGAS_ENABLED: boolean;
    ORCHESTRATION_GRAPHS_ENABLED: boolean;
    ORCHESTRATION_SNAPSHOTS_ENABLED: boolean;
  };
  unitOfWork: OrchestrationUnitOfWork;
  authorize: (input: { actorRole: string; organizationId: string; orchestration: OrchestrationState }) => boolean;
}

export async function executeOrchestrationStep(input: {
  dependencies: OrchestratorExecutionDependencies;
  orchestration: OrchestrationState;
  graph: OrchestrationGraph;
  actorRole: string;
  targetNodeId: string;
}): Promise<OrchestrationResult> {
  const { dependencies, orchestration, graph, actorRole, targetNodeId } = input;

  if (!dependencies.flags.RECRUITMENT_ORCHESTRATOR_ENABLED) {
    return {
      success: false,
      orchestrationId: orchestration.identity.orchestrationId,
      orchestrationType: orchestration.identity.orchestrationType,
      graphVersion: graph.graphVersion,
      previousNode: orchestration.currentNodeId,
      currentNode: orchestration.currentNodeId,
      previousVersion: orchestration.orchestrationVersionNumber,
      currentVersion: orchestration.orchestrationVersionNumber,
      workflowsInvoked: [],
      commandsExecuted: [],
      queriesExecuted: [],
      policiesEvaluated: [],
      businessRulesEvaluated: [],
      sagaStepsCompleted: [],
      sagaStepsFailed: [],
      compensationStatus: "not_required",
      eventsEmitted: [],
      scheduledActionsCreated: [],
      retryState: { attempts: 0, nextRetryAt: null, exhausted: false },
      timeoutState: { timeoutAt: orchestration.timing.timeoutAt, expired: false },
      recoveryState: orchestration.recoveryState,
      humanReviewRequired: false,
      blockingReasons: ["feature_disabled"],
      requiredNextActions: ["Enable RECRUITMENT_ORCHESTRATOR_ENABLED to execute orchestration steps."],
      correlationId: orchestration.correlationId,
      explanation: "Recruitment orchestrator is disabled by feature flag.",
      errorCategory: "graph_invalid",
    };
  }

  if (!dependencies.authorize({ actorRole, organizationId: orchestration.scope.organizationId, orchestration })) {
    throw createOrchestratorError({
      category: "unauthorized",
      message: "Actor is not authorized for orchestration step execution.",
      correlationId: orchestration.correlationId,
      blockingReasons: ["unauthorized"],
      requiredNextActions: ["Use an authorized Prime Global staff role."],
    });
  }

  const edge = graph.edges.find((entry) => entry.fromNodeId === orchestration.currentNodeId && entry.toNodeId === targetNodeId);
  if (!edge) {
    throw createOrchestratorError({
      category: "invalid_node_transition",
      message: `No edge from ${orchestration.currentNodeId} to ${targetNodeId}`,
      correlationId: orchestration.correlationId,
      blockingReasons: ["invalid_node_transition"],
      requiredNextActions: ["Follow an allowed graph edge."],
    });
  }

  const next: OrchestrationState = {
    ...orchestration,
    currentNodeId: targetNodeId,
    status: graph.terminalNodeIds.includes(targetNodeId) ? "completed" : "running",
    orchestrationVersionNumber: orchestration.orchestrationVersionNumber + 1,
    timing: {
      ...orchestration.timing,
      updatedAt: new Date().toISOString(),
    },
  };

  await dependencies.unitOfWork.runAtomic({
    orchestrationState: next,
    workflowCommandResult: {},
    workflowStateUpdate: {},
    sagaStepUpdate: {},
    snapshotAppend: {
      orchestrationId: next.identity.orchestrationId,
      orchestrationState: next,
      graphVersion: graph.graphVersion,
      currentNodeId: next.currentNodeId,
      completedNodes: [next.currentNodeId],
      pendingNodes: graph.nodes.map((node) => node.nodeId).filter((nodeId) => nodeId !== next.currentNodeId),
      failedNodes: [],
      compensatedNodes: [],
      orchestrationVersion: next.orchestrationVersionNumber,
      eventCursor: { sequence: 1, eventId: null },
      retryState: { attempts: 0, nextRetryAt: null },
      timeoutState: { timeoutAt: next.timing.timeoutAt, expired: false },
      scheduledActionState: { nextActionAt: next.timing.nextScheduledActionAt },
      humanInterventionState: { required: next.humanReviewRequired, reason: next.lastErrorCategory },
      integrityHash: "runtime-generated",
      createdAt: new Date().toISOString(),
    },
    domainEvents: [
      {
        eventType: "OrchestrationStepCompleted",
        payload: { orchestrationId: next.identity.orchestrationId, nodeId: targetNodeId },
      },
    ],
    auditReference: `audit:${next.identity.orchestrationId}`,
    evidenceReference: `evidence:${next.identity.orchestrationId}`,
    timelineEvent: {
      eventType: "orchestrator.transition",
      description: `${orchestration.currentNodeId} -> ${targetNodeId}`,
      timestamp: new Date().toISOString(),
    },
    scheduledAction: null,
    idempotencyCompletion: { key: next.idempotencyKey, status: "completed" },
    retryState: { attempts: 0, nextRetryAt: null },
    compensationState: { status: "not_required", steps: [] },
  });

  return {
    success: true,
    orchestrationId: next.identity.orchestrationId,
    orchestrationType: next.identity.orchestrationType,
    graphVersion: graph.graphVersion,
    previousNode: orchestration.currentNodeId,
    currentNode: next.currentNodeId,
    previousVersion: orchestration.orchestrationVersionNumber,
    currentVersion: next.orchestrationVersionNumber,
    workflowsInvoked: [],
    commandsExecuted: [],
    queriesExecuted: [],
    policiesEvaluated: [],
    businessRulesEvaluated: [],
    sagaStepsCompleted: [targetNodeId],
    sagaStepsFailed: [],
    compensationStatus: "not_required",
    eventsEmitted: ["OrchestrationStepCompleted"],
    scheduledActionsCreated: [],
    retryState: { attempts: 0, nextRetryAt: null, exhausted: false },
    timeoutState: { timeoutAt: next.timing.timeoutAt, expired: false },
    recoveryState: next.recoveryState,
    humanReviewRequired: false,
    blockingReasons: [],
    requiredNextActions: [],
    correlationId: next.correlationId,
    explanation: "Orchestration step executed successfully.",
  };
}
