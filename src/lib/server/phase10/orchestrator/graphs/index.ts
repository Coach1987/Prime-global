import type { WorkflowType } from "../../workflow/index.ts";

export type OrchestrationNodeType =
  | "workflow"
  | "manual_review"
  | "waiting"
  | "scheduled"
  | "terminal"
  | "parallel_join"
  | "feature_flag_gate";

export interface OrchestrationNode {
  nodeId: string;
  nodeType: OrchestrationNodeType;
  workflowType: WorkflowType | null;
  requiredCommand: string | null;
  requiredQuery: string | null;
  allowedRoles: string[];
  requiredPolicies: string[];
  requiredBusinessRules: string[];
  timeoutMs: number | null;
  retryPolicyId: string | null;
  compensationNodeId: string | null;
  visibilityScope: "candidate" | "employer" | "recruiter" | "admin" | "super-admin";
  evidenceRequired: boolean;
  auditRequired: boolean;
  humanReviewRequired: boolean;
  irreversible: boolean;
  featureFlag: string | null;
}

export interface OrchestrationEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  condition?: string;
  policyGate?: string;
  businessRuleGate?: string;
  edgeType?: "default" | "failure" | "timeout" | "compensation";
}

export interface OrchestrationGraph {
  graphId: string;
  graphVersion: string;
  startNodeId: string;
  terminalNodeIds: string[];
  allowCycles: boolean;
  nodes: OrchestrationNode[];
  edges: OrchestrationEdge[];
}

export interface GraphValidationIssue {
  code:
    | "missing_nodes"
    | "duplicate_nodes"
    | "invalid_edges"
    | "unreachable_nodes"
    | "cycle_not_allowed"
    | "missing_terminal_state"
    | "invalid_compensation_targets"
    | "unsafe_irreversible_transition";
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  issues: GraphValidationIssue[];
}

function reachableNodes(graph: OrchestrationGraph): Set<string> {
  const seen = new Set<string>();
  const queue = [graph.startNodeId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    for (const edge of graph.edges.filter((entry) => entry.fromNodeId === current)) {
      queue.push(edge.toNodeId);
    }
  }

  return seen;
}

function hasCycle(graph: OrchestrationGraph): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) adjacency.set(node.nodeId, []);
  for (const edge of graph.edges) adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visiting.add(nodeId);
    const next = adjacency.get(nodeId) ?? [];
    for (const target of next) {
      if (dfs(target)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return graph.nodes.some((node) => dfs(node.nodeId));
}

export function validateOrchestrationGraph(graph: OrchestrationGraph): GraphValidationResult {
  const issues: GraphValidationIssue[] = [];
  const nodeIds = graph.nodes.map((node) => node.nodeId);
  const nodeSet = new Set(nodeIds);

  if (graph.nodes.length === 0) {
    issues.push({ code: "missing_nodes", message: "Graph must include at least one node." });
  }

  if (nodeSet.size !== nodeIds.length) {
    issues.push({ code: "duplicate_nodes", message: "Graph contains duplicate node IDs." });
  }

  const missingEdgeTargets = graph.edges.filter((edge) => !nodeSet.has(edge.fromNodeId) || !nodeSet.has(edge.toNodeId));
  if (missingEdgeTargets.length > 0) {
    issues.push({ code: "invalid_edges", message: "Graph contains edges referencing unknown nodes." });
  }

  const reached = reachableNodes(graph);
  const unreachable = graph.nodes.filter((node) => !reached.has(node.nodeId));
  if (unreachable.length > 0) {
    issues.push({ code: "unreachable_nodes", message: `Unreachable nodes: ${unreachable.map((node) => node.nodeId).join(", ")}` });
  }

  if (!graph.allowCycles && hasCycle(graph)) {
    issues.push({ code: "cycle_not_allowed", message: "Graph contains a cycle but cycles are not enabled." });
  }

  if (graph.terminalNodeIds.length === 0) {
    issues.push({ code: "missing_terminal_state", message: "Graph requires at least one terminal node." });
  }

  const invalidCompensation = graph.nodes.filter(
    (node) => node.compensationNodeId && !nodeSet.has(node.compensationNodeId)
  );
  if (invalidCompensation.length > 0) {
    issues.push({ code: "invalid_compensation_targets", message: "One or more compensation targets are missing." });
  }

  const unsafeIrreversible = graph.nodes.filter((node) => node.irreversible && !node.humanReviewRequired);
  if (unsafeIrreversible.length > 0) {
    issues.push({
      code: "unsafe_irreversible_transition",
      message: "Irreversible nodes must require human review.",
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function createProtectedRecruitmentGraphFoundation(): OrchestrationGraph {
  return {
    graphId: "protected-recruitment",
    graphVersion: "1.0.0",
    startNodeId: "candidate_selected",
    terminalNodeIds: ["hiring_completed"],
    allowCycles: false,
    nodes: [
      {
        nodeId: "candidate_selected",
        nodeType: "workflow",
        workflowType: "candidate_selection",
        requiredCommand: "SelectCandidateCommand",
        requiredQuery: null,
        allowedRoles: ["prime_global_recruiter"],
        requiredPolicies: ["candidate selection required before interview invitation"],
        requiredBusinessRules: [],
        timeoutMs: null,
        retryPolicyId: null,
        compensationNodeId: null,
        visibilityScope: "recruiter",
        evidenceRequired: true,
        auditRequired: true,
        humanReviewRequired: false,
        irreversible: false,
        featureFlag: "RECRUITMENT_ORCHESTRATOR_ENABLED",
      },
      {
        nodeId: "interview_workflow",
        nodeType: "workflow",
        workflowType: "interview",
        requiredCommand: "ActivateInterviewCommand",
        requiredQuery: "GetInterviewStateQuery",
        allowedRoles: ["prime_global_recruiter"],
        requiredPolicies: [],
        requiredBusinessRules: ["Activate Interview"],
        timeoutMs: 72 * 60 * 60 * 1000,
        retryPolicyId: "orchestrator-default",
        compensationNodeId: "candidate_selected",
        visibilityScope: "recruiter",
        evidenceRequired: true,
        auditRequired: true,
        humanReviewRequired: false,
        irreversible: false,
        featureFlag: "RECRUITMENT_ORCHESTRATOR_ENABLED",
      },
      {
        nodeId: "hiring_completed",
        nodeType: "terminal",
        workflowType: "hiring",
        requiredCommand: null,
        requiredQuery: "GetRecruitmentWorkflowStateQuery",
        allowedRoles: ["prime_global_recruiter", "prime_global_admin"],
        requiredPolicies: [],
        requiredBusinessRules: [],
        timeoutMs: null,
        retryPolicyId: null,
        compensationNodeId: null,
        visibilityScope: "admin",
        evidenceRequired: true,
        auditRequired: true,
        humanReviewRequired: true,
        irreversible: true,
        featureFlag: "RECRUITMENT_ORCHESTRATOR_ENABLED",
      },
    ],
    edges: [
      {
        edgeId: "edge-1",
        fromNodeId: "candidate_selected",
        toNodeId: "interview_workflow",
        edgeType: "default",
      },
      {
        edgeId: "edge-2",
        fromNodeId: "interview_workflow",
        toNodeId: "hiring_completed",
        edgeType: "default",
      },
    ],
  };
}
