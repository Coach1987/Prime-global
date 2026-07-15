import type { OrchestrationState } from "../types/index.ts";
import type { OrchestrationGraph } from "../graphs/index.ts";
import type { OrchestrationSnapshot } from "../snapshots/index.ts";
import type { ManualInterventionRecord } from "../intervention/index.ts";

export type InspectorRole = "candidate" | "employer" | "recruiter" | "admin" | "super-admin";

export interface OrchestrationInspectorData {
  summary: {
    orchestrationId: string;
    orchestrationType: string;
    status: string;
    currentNode: string;
  };
  graph: OrchestrationGraph;
  completedNodes: string[];
  pendingNodes: string[];
  failedNodes: string[];
  compensationState: string;
  retryState: { attempts: number; nextRetryAt: string | null };
  timeoutState: { timeoutAt: string | null; expired: boolean };
  snapshotHistory: OrchestrationSnapshot[];
  recoveryHistory: Array<{ state: string; reason: string; recoveredAt: string }>;
  manualInterventions: ManualInterventionRecord[];
  domainEvents: Array<{ eventType: string; occurredAt: string }>;
  auditReferences: string[];
  evidenceReferences: string[];
  timelineProjection: Array<{ timestamp: string; message: string }>;
  visualization: {
    currentNode: string;
    completedNodes: string[];
    failedNodes: string[];
    waitingNodes: string[];
    retryingNodes: string[];
    compensatedNodes: string[];
    manualReviewNodes: string[];
    terminal: boolean;
  };
}

function shapeForRole(role: InspectorRole, data: OrchestrationInspectorData): OrchestrationInspectorData {
  if (role === "admin" || role === "super-admin" || role === "recruiter") {
    return data;
  }

  return {
    ...data,
    graph: {
      ...data.graph,
      nodes: data.graph.nodes.map((node) => ({
        ...node,
        requiredPolicies: [],
        requiredBusinessRules: [],
        compensationNodeId: null,
      })),
      edges: data.graph.edges.map((edge) => ({
        ...edge,
        policyGate: undefined,
        businessRuleGate: undefined,
      })),
    },
    snapshotHistory: [],
    recoveryHistory: [],
    manualInterventions: [],
    auditReferences: [],
    evidenceReferences: [],
  };
}

export function createOrchestrationInspector() {
  return {
    inspect(role: InspectorRole, input: {
      state: OrchestrationState;
      graph: OrchestrationGraph;
      snapshotHistory: OrchestrationSnapshot[];
      recoveryHistory: Array<{ state: string; reason: string; recoveredAt: string }>;
      interventions: ManualInterventionRecord[];
    }): OrchestrationInspectorData {
      const data: OrchestrationInspectorData = {
        summary: {
          orchestrationId: input.state.identity.orchestrationId,
          orchestrationType: input.state.identity.orchestrationType,
          status: input.state.status,
          currentNode: input.state.currentNodeId,
        },
        graph: input.graph,
        completedNodes: input.snapshotHistory.at(-1)?.completedNodes ?? [],
        pendingNodes: input.snapshotHistory.at(-1)?.pendingNodes ?? [],
        failedNodes: input.snapshotHistory.at(-1)?.failedNodes ?? [],
        compensationState: input.state.status,
        retryState: input.snapshotHistory.at(-1)?.retryState ?? { attempts: 0, nextRetryAt: null },
        timeoutState: input.snapshotHistory.at(-1)?.timeoutState ?? { timeoutAt: null, expired: false },
        snapshotHistory: input.snapshotHistory,
        recoveryHistory: input.recoveryHistory,
        manualInterventions: input.interventions,
        domainEvents: [],
        auditReferences: [],
        evidenceReferences: [],
        timelineProjection: [],
        visualization: {
          currentNode: input.state.currentNodeId,
          completedNodes: input.snapshotHistory.at(-1)?.completedNodes ?? [],
          failedNodes: input.snapshotHistory.at(-1)?.failedNodes ?? [],
          waitingNodes: input.snapshotHistory.at(-1)?.pendingNodes ?? [],
          retryingNodes: [],
          compensatedNodes: input.snapshotHistory.at(-1)?.compensatedNodes ?? [],
          manualReviewNodes: input.state.humanReviewRequired ? [input.state.currentNodeId] : [],
          terminal: input.graph.terminalNodeIds.includes(input.state.currentNodeId),
        },
      };

      return shapeForRole(role, data);
    },
  };
}
