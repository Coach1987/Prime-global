import { randomUUID } from "node:crypto";
import type { OrchestrationGraph } from "../graphs/index.ts";
import type { OrchestrationIdentity, OrchestrationScope } from "../types/index.ts";
import { createOrchestrationState } from "../types/index.ts";

export function createOrchestrationIdentity(overrides?: Partial<OrchestrationIdentity>): OrchestrationIdentity {
  return {
    orchestrationId: overrides?.orchestrationId ?? `orch:${randomUUID()}`,
    orchestrationType: overrides?.orchestrationType ?? "ProtectedRecruitmentOrchestration",
    orchestrationVersion: overrides?.orchestrationVersion ?? "1.0.0",
    schemaVersion: overrides?.schemaVersion ?? 1,
    graphDefinitionVersion: overrides?.graphDefinitionVersion ?? "1.0.0",
  };
}

export function createOrchestrationScope(overrides?: Partial<OrchestrationScope>): OrchestrationScope {
  return {
    organizationId: overrides?.organizationId ?? "prime-global",
    tenantId: overrides?.tenantId ?? null,
    candidateId: overrides?.candidateId ?? null,
    employerId: overrides?.employerId ?? null,
    jobId: overrides?.jobId ?? null,
    applicationId: overrides?.applicationId ?? null,
  };
}

export function createOrchestrationGraph(overrides?: Partial<OrchestrationGraph>): OrchestrationGraph {
  return {
    graphId: overrides?.graphId ?? "test-graph",
    graphVersion: overrides?.graphVersion ?? "1.0.0",
    startNodeId: overrides?.startNodeId ?? "start",
    terminalNodeIds: overrides?.terminalNodeIds ?? ["done"],
    allowCycles: overrides?.allowCycles ?? false,
    nodes:
      overrides?.nodes ??
      [
        {
          nodeId: "start",
          nodeType: "workflow",
          workflowType: "candidate_selection",
          requiredCommand: "SelectCandidateCommand",
          requiredQuery: null,
          allowedRoles: ["prime_global_recruiter"],
          requiredPolicies: [],
          requiredBusinessRules: [],
          timeoutMs: null,
          retryPolicyId: null,
          compensationNodeId: null,
          visibilityScope: "recruiter",
          evidenceRequired: true,
          auditRequired: true,
          humanReviewRequired: false,
          irreversible: false,
          featureFlag: null,
        },
        {
          nodeId: "done",
          nodeType: "terminal",
          workflowType: "hiring",
          requiredCommand: null,
          requiredQuery: null,
          allowedRoles: ["prime_global_recruiter"],
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
          featureFlag: null,
        },
      ],
    edges:
      overrides?.edges ??
      [
        {
          edgeId: "edge-start-done",
          fromNodeId: "start",
          toNodeId: "done",
          edgeType: "default",
        },
      ],
  };
}

export function createOrchestrationStateFactory() {
  const identity = createOrchestrationIdentity();
  return createOrchestrationState({
    identity,
    scope: createOrchestrationScope(),
    currentNodeId: "start",
    correlationId: `corr:${randomUUID()}`,
    idempotencyKey: `idem:${randomUUID()}`,
  });
}
