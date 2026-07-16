const SENSITIVE_KEYS = new Set([
  "token",
  "secret",
  "password",
  "privateCv",
  "contact",
  "email",
  "phone",
  "paymentCredentials",
]);

export type OrchestratorErrorCategory =
  | "orchestration_not_found"
  | "graph_invalid"
  | "invalid_node_transition"
  | "orchestration_locked"
  | "version_conflict"
  | "duplicate_execution"
  | "scheduled_action_conflict"
  | "timeout_expired"
  | "retry_exhausted"
  | "snapshot_invalid"
  | "integrity_compromised"
  | "recovery_failed"
  | "compensation_failed"
  | "manual_intervention_required"
  | "policy_denied"
  | "business_rule_failed"
  | "unauthorized"
  | "cross_organization_access_denied";

export interface OrchestratorErrorShape {
  category: OrchestratorErrorCategory;
  message: string;
  correlationId: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  details?: Record<string, unknown>;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [key, SENSITIVE_KEYS.has(key) ? "[redacted]" : redact(entry)])
    );
  }
  return value;
}

export class OrchestratorError extends Error {
  category: OrchestratorErrorCategory;
  correlationId: string;
  blockingReasons: string[];
  requiredNextActions: string[];
  details?: Record<string, unknown>;

  constructor(input: OrchestratorErrorShape) {
    super(input.message);
    this.name = "OrchestratorError";
    this.category = input.category;
    this.correlationId = input.correlationId;
    this.blockingReasons = input.blockingReasons;
    this.requiredNextActions = input.requiredNextActions;
    this.details = input.details;
  }

  toPublicShape(): OrchestratorErrorShape {
    return {
      category: this.category,
      message: this.message,
      correlationId: this.correlationId,
      blockingReasons: this.blockingReasons,
      requiredNextActions: this.requiredNextActions,
      details: this.details ? (redact(this.details) as Record<string, unknown>) : undefined,
    };
  }
}

export function createOrchestratorError(input: OrchestratorErrorShape): OrchestratorError {
  return new OrchestratorError(input);
}
