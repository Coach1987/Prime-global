export type WorkflowKernelErrorCode =
  | "unauthenticated"
  | "unauthorized"
  | "feature_disabled"
  | "policy_denied"
  | "business_rule_failed"
  | "invalid_transition"
  | "idempotency_conflict"
  | "workflow_locked"
  | "optimistic_concurrency_conflict"
  | "persistence_failure"
  | "event_handler_failure"
  | "compensation_failure"
  | "manual_review_required";

export interface WorkflowKernelErrorShape {
  code: WorkflowKernelErrorCode;
  message: string;
  correlationId: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  details?: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set([
  "token",
  "password",
  "secret",
  "privateCv",
  "cvContent",
  "contact",
  "email",
  "phone",
  "paymentCredentials",
]);

function redact(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((entry) => redact(entry));
  }
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, SENSITIVE_KEYS.has(key) ? "[redacted]" : redact(value)])
    );
  }
  return input;
}

export class WorkflowKernelError extends Error {
  code: WorkflowKernelErrorCode;
  correlationId: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  details?: Record<string, unknown>;

  constructor(shape: WorkflowKernelErrorShape) {
    super(shape.message);
    this.name = "WorkflowKernelError";
    this.code = shape.code;
    this.correlationId = shape.correlationId;
    this.blockingReasons = shape.blockingReasons;
    this.requiredNextActions = shape.requiredNextActions;
    this.details = shape.details;
  }

  toPublicShape(): WorkflowKernelErrorShape {
    return {
      code: this.code,
      message: this.message,
      correlationId: this.correlationId,
      blockingReasons: this.blockingReasons,
      requiredNextActions: this.requiredNextActions,
      details: this.details ? (redact(this.details) as Record<string, unknown>) : undefined,
    };
  }
}

export function createWorkflowKernelError(shape: WorkflowKernelErrorShape): WorkflowKernelError {
  return new WorkflowKernelError(shape);
}
