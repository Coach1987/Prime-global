import type { WorkflowAuditEntry, WorkflowEvidenceReference } from "../types/index.ts";

export type CompensationStatus = "completed" | "partial" | "failed" | "manual_review";

export interface CompensationAction {
  step: string;
  irreversible: boolean;
  execute: () => Promise<void>;
}

export interface CompensationAttempt {
  step: string;
  status: "completed" | "failed" | "skipped_manual_review";
  irreversible: boolean;
  message: string;
  timestamp: string;
}

export interface CompensationExecutionResult {
  status: CompensationStatus;
  attempts: CompensationAttempt[];
  manualReviewRequired: boolean;
  explanation: string;
  auditEntries: WorkflowAuditEntry[];
  evidenceReferences: WorkflowEvidenceReference[];
}

export function createCompensationPlan() {
  const actions: CompensationAction[] = [];

  return {
    register(action: CompensationAction) {
      actions.push(action);
    },

    async run(input: {
      workflowId: string;
      commandId: string;
      actorId: string;
      actorRole: string;
      organizationId: string;
      tenantId: string | null;
    }): Promise<CompensationExecutionResult> {
      const attempts: CompensationAttempt[] = [];
      const auditEntries: WorkflowAuditEntry[] = [];
      const evidenceReferences: WorkflowEvidenceReference[] = [];
      let manualReviewRequired = false;

      for (const action of actions.slice().reverse()) {
        const timestamp = new Date().toISOString();

        if (manualReviewRequired && action.irreversible) {
          attempts.push({
            step: action.step,
            status: "skipped_manual_review",
            irreversible: true,
            message: "Skipped because manual review is required for irreversible compensation.",
            timestamp,
          });
          continue;
        }

        try {
          await action.execute();
          attempts.push({
            step: action.step,
            status: "completed",
            irreversible: action.irreversible,
            message: "Compensation step completed.",
            timestamp,
          });
          auditEntries.push({
            workflowId: input.workflowId,
            commandId: input.commandId,
            actorId: input.actorId,
            actorRole: input.actorRole,
            organizationId: input.organizationId,
            tenantId: input.tenantId,
            outcome: "success",
            reason: `Compensation step ${action.step} completed`,
            timestamp,
          });
        } catch {
          manualReviewRequired = manualReviewRequired || action.irreversible;
          attempts.push({
            step: action.step,
            status: "failed",
            irreversible: action.irreversible,
            message: action.irreversible
              ? "Irreversible compensation step failed. Human handover required."
              : "Compensation step failed.",
            timestamp,
          });
          auditEntries.push({
            workflowId: input.workflowId,
            commandId: input.commandId,
            actorId: input.actorId,
            actorRole: input.actorRole,
            organizationId: input.organizationId,
            tenantId: input.tenantId,
            outcome: "manual_review",
            reason: `Compensation step ${action.step} failed`,
            timestamp,
          });
          evidenceReferences.push({
            workflowId: input.workflowId,
            referenceId: `${input.commandId}:${action.step}:${timestamp}`,
            evidenceType: "compensation_attempt",
            timestamp,
            redactedMetadata: {
              step: action.step,
              irreversible: action.irreversible,
              result: "failed",
            },
          });
        }
      }

      const completedCount = attempts.filter((entry) => entry.status === "completed").length;
      const failedCount = attempts.filter((entry) => entry.status === "failed").length;

      let status: CompensationStatus = "completed";
      if (manualReviewRequired) status = "manual_review";
      else if (failedCount > 0 && completedCount > 0) status = "partial";
      else if (failedCount > 0) status = "failed";

      return {
        status,
        attempts,
        manualReviewRequired,
        explanation:
          status === "completed"
            ? "Compensation completed successfully."
            : status === "partial"
              ? "Compensation partially completed."
              : status === "manual_review"
                ? "Compensation requires human review due to irreversible failure."
                : "Compensation failed.",
        auditEntries,
        evidenceReferences,
      };
    },
  };
}
