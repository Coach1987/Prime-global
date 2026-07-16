import type { WorkflowQuery, WorkflowQueryName, WorkflowQueryAuthDecision } from "../types/index.ts";

export interface WorkflowQueryDefinition<TParams = Record<string, unknown>, TResult = unknown> {
  queryName: WorkflowQueryName;
  version: string;
  authorize: (query: WorkflowQuery<TParams, unknown>) => WorkflowQueryAuthDecision;
  privacyShape: (result: TResult) => TResult;
}

export interface WorkflowQueryExecutionResult<TResult> {
  queryName: WorkflowQueryName;
  correlationId: string;
  result: TResult;
}

function allowed(): WorkflowQueryAuthDecision {
  return { allowed: true, reason: "authorized" };
}

export const workflowQueryDefinitions: WorkflowQueryDefinition[] = [
  { queryName: "GetRecruitmentWorkflowStateQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
  { queryName: "GetInterviewStateQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
  { queryName: "GetContractGateStateQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
  { queryName: "GetViolationStateQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
  { queryName: "GetAppealStateQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
  { queryName: "GetTimelineQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
  { queryName: "GetWorkflowAuditQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
  { queryName: "GetWorkflowEvidenceSummaryQuery", version: "1.0.0", authorize: allowed, privacyShape: (result) => result },
];

function cloneReadonly<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => cloneReadonly(item))) as unknown as T;
  }
  const record = value as Record<string, unknown>;
  const output = Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, cloneReadonly(entry)]));
  return Object.freeze(output) as T;
}

export async function executeWorkflowQuery<TResult>(query: WorkflowQuery<Record<string, unknown>, TResult>): Promise<WorkflowQueryExecutionResult<TResult>> {
  const definition = workflowQueryDefinitions.find((entry) => entry.queryName === query.queryName) as
    | WorkflowQueryDefinition<Record<string, unknown>, TResult>
    | undefined;
  if (!definition) {
    throw new Error(`Unknown query ${query.queryName}`);
  }

  if (!query.actor.authenticated) {
    throw new Error("unauthenticated");
  }

  const authDecision = definition.authorize(query);
  if (!authDecision.allowed) {
    throw new Error(authDecision.reason);
  }

  if (query.organization.organizationId !== query.actor.permissions.find((entry) => entry.startsWith("org:"))?.replace("org:", "") && !query.actor.permissions.includes("org:*")) {
    throw new Error("cross-organization access denied");
  }

  if (query.tenant.tenantId && query.organization.tenantId && query.tenant.tenantId !== query.organization.tenantId) {
    throw new Error("cross-tenant access denied");
  }

  const readOnlyParams = cloneReadonly(query.params);
  const result = await query.executeReadOnly(readOnlyParams);

  return {
    queryName: query.queryName,
    correlationId: query.correlationId,
    result: definition.privacyShape(cloneReadonly(result)),
  };
}
