import { executeWorkflowQuery } from "../queries/index.ts";
import { createWorkflowKernelError } from "../errors/index.ts";
import type { WorkflowQuery } from "../types/index.ts";

export interface WorkflowQueryExecutorDependencies {
  featureFlags: {
    WORKFLOW_KERNEL_ENABLED: boolean;
    WORKFLOW_QUERIES_ENABLED: boolean;
  };
}

export async function executeKernelQuery<TResult>(
  dependencies: WorkflowQueryExecutorDependencies,
  query: WorkflowQuery<Record<string, unknown>, TResult>
) {
  if (!dependencies.featureFlags.WORKFLOW_KERNEL_ENABLED || !dependencies.featureFlags.WORKFLOW_QUERIES_ENABLED) {
    throw createWorkflowKernelError({
      code: "feature_disabled",
      message: "Workflow query execution is disabled by feature flag.",
      correlationId: query.correlationId,
      blockingReasons: ["feature_disabled"],
      requiredNextActions: ["Enable workflow query feature flags to execute this query."],
    });
  }

  try {
    return await executeWorkflowQuery(query);
  } catch (error) {
    const message = error instanceof Error ? error.message : "query_execution_failed";
    const code =
      message.includes("unauthenticated")
        ? "unauthenticated"
        : message.includes("cross-organization") || message.includes("cross-tenant")
          ? "unauthorized"
          : "business_rule_failed";

    throw createWorkflowKernelError({
      code,
      message: "Workflow query denied.",
      correlationId: query.correlationId,
      blockingReasons: [message],
      requiredNextActions: ["Check authentication, authorization, and scope before retrying."],
      details: { queryName: query.queryName },
    });
  }
}
