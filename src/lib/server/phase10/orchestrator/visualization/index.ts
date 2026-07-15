import type { OrchestrationGraph } from "../graphs/index.ts";

export interface NodeRuntimeState {
  nodeId: string;
  status: "completed" | "failed" | "waiting" | "retrying" | "compensated" | "manual_review" | "current" | "pending";
  enteredAt?: string;
  exitedAt?: string;
  blockingReasons?: string[];
  requiredNextActions?: string[];
}

export interface OrchestrationVisualizationProjection {
  nodes: Array<{
    nodeId: string;
    status: NodeRuntimeState["status"];
    timestamp: string | null;
    durationMs: number | null;
    blockingReasons: string[];
    requiredNextActions: string[];
    visibilityScope: string;
  }>;
  edges: OrchestrationGraph["edges"];
  currentNode: string;
  completedNodes: string[];
  failedNodes: string[];
  waitingNodes: string[];
  retryingNodes: string[];
  compensatedNodes: string[];
  manualReviewNodes: string[];
  terminalState: boolean;
}

export function createVisualizationProjection(input: {
  graph: OrchestrationGraph;
  currentNode: string;
  runtimeStates: NodeRuntimeState[];
}): OrchestrationVisualizationProjection {
  const byId = new Map(input.runtimeStates.map((entry) => [entry.nodeId, entry]));

  const nodes = input.graph.nodes.map((node) => {
    const runtime = byId.get(node.nodeId);
    const enteredAt = runtime?.enteredAt ? new Date(runtime.enteredAt).getTime() : null;
    const exitedAt = runtime?.exitedAt ? new Date(runtime.exitedAt).getTime() : null;
    const durationMs = enteredAt !== null && exitedAt !== null ? Math.max(0, exitedAt - enteredAt) : null;

    return {
      nodeId: node.nodeId,
      status: runtime?.status ?? (node.nodeId === input.currentNode ? "current" : "pending"),
      timestamp: runtime?.enteredAt ?? null,
      durationMs,
      blockingReasons: runtime?.blockingReasons ?? [],
      requiredNextActions: runtime?.requiredNextActions ?? [],
      visibilityScope: node.visibilityScope,
    };
  });

  const pick = (status: NodeRuntimeState["status"]) => nodes.filter((node) => node.status === status).map((node) => node.nodeId);

  return {
    nodes,
    edges: input.graph.edges,
    currentNode: input.currentNode,
    completedNodes: pick("completed"),
    failedNodes: pick("failed"),
    waitingNodes: pick("waiting"),
    retryingNodes: pick("retrying"),
    compensatedNodes: pick("compensated"),
    manualReviewNodes: pick("manual_review"),
    terminalState: input.graph.terminalNodeIds.includes(input.currentNode),
  };
}
