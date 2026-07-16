import type { TrustEdge, TrustGraphRepository, TrustNode } from "./types.ts";

export function createInMemoryTrustGraphRepository(): TrustGraphRepository {
  const nodes = new Map<string, TrustNode>();
  const edges = new Map<string, TrustEdge>();

  return {
    async upsertNode(node) {
      nodes.set(node.nodeId, node);
    },
    async upsertEdge(edge) {
      edges.set(edge.edgeId, edge);
    },
    async listNodeEdges(nodeId) {
      return Array.from(edges.values()).filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId);
    },
    async getNode(nodeId) {
      return nodes.get(nodeId) ?? null;
    },
  };
}
