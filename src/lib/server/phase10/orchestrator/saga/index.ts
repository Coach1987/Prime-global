export type SagaStatus =
  | "pending"
  | "running"
  | "waiting"
  | "retry_scheduled"
  | "completed"
  | "failed"
  | "compensating"
  | "compensated"
  | "partially_compensated"
  | "manual_review"
  | "cancelled"
  | "expired";

export interface SagaRetryPolicy {
  maxAttempts: number;
  delayMs: number;
}

export interface SagaStep {
  stepId: string;
  stepName: string;
  stepVersion: string;
  invocation: string;
  prerequisites: string[];
  successCriteria: string[];
  timeoutMs: number | null;
  retryPolicy: SagaRetryPolicy;
  compensationAction: (() => Promise<void>) | null;
  irreversible: boolean;
  manualReviewRequired: boolean;
  evidenceRequired: boolean;
  auditRequired: boolean;
  nextStepId: string | null;
  failureStepId: string | null;
  skippable: boolean;
  resultMetadata: Record<string, unknown>;
}

export interface SagaStepResult {
  stepId: string;
  status: SagaStatus;
  attempts: number;
  completedAt: string | null;
  errorCategory: string | null;
  metadata: Record<string, unknown>;
}

export interface SagaExecutionResult {
  status: SagaStatus;
  completedSteps: string[];
  failedSteps: string[];
  compensatedSteps: string[];
  manualReviewRequired: boolean;
  explanation: string;
}

export async function runSagaSteps(steps: SagaStep[], invoke: (step: SagaStep) => Promise<void>): Promise<SagaExecutionResult> {
  const completedSteps: string[] = [];
  const failedSteps: string[] = [];
  const compensatedSteps: string[] = [];

  for (const step of steps) {
    try {
      await invoke(step);
      completedSteps.push(step.stepId);
    } catch {
      failedSteps.push(step.stepId);

      if (step.irreversible || step.manualReviewRequired) {
        return {
          status: "manual_review",
          completedSteps,
          failedSteps,
          compensatedSteps,
          manualReviewRequired: true,
          explanation: "Irreversible step failed; manual review required.",
        };
      }

      for (const completedStepId of completedSteps.slice().reverse()) {
        const completedStep = steps.find((entry) => entry.stepId === completedStepId);
        if (!completedStep?.compensationAction) continue;
        try {
          await completedStep.compensationAction();
          compensatedSteps.push(completedStepId);
        } catch {
          return {
            status: "partially_compensated",
            completedSteps,
            failedSteps,
            compensatedSteps,
            manualReviewRequired: true,
            explanation: "Compensation partially completed; manual review required.",
          };
        }
      }

      return {
        status: "compensated",
        completedSteps,
        failedSteps,
        compensatedSteps,
        manualReviewRequired: false,
        explanation: "Saga failed and compensation completed in reverse order.",
      };
    }
  }

  return {
    status: "completed",
    completedSteps,
    failedSteps,
    compensatedSteps,
    manualReviewRequired: false,
    explanation: "Saga completed successfully.",
  };
}
