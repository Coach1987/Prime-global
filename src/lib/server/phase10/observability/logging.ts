export type Phase10DecisionOrigin = "automated_detection" | "ai_recommendation" | "staff_decision" | "system_rule";

export interface Phase10LogEntry {
  requestId: string;
  eventId: string;
  actorId?: string | null;
  actorRole?: string | null;
  organizationId?: string | null;
  tenantId?: string | null;
  conversationId?: string | null;
  interviewId?: string | null;
  policyDecision?: string | null;
  workflowTransition?: string | null;
  result: "success" | "blocked" | "warning" | "error";
  durationMs?: number | null;
  errorCategory?: string | null;
  decisionOrigin: Phase10DecisionOrigin;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set([
  "accessToken",
  "access_token",
  "password",
  "privateCv",
  "privateCV",
  "cvText",
  "contactDetails",
  "paymentCredentials",
  "secret",
  "token",
]);

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 117)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [key, SENSITIVE_KEYS.has(key) ? "[redacted]" : redactValue(entry)])
    );
  }

  return value;
}

export function sanitizePhase10LogEntry(entry: Phase10LogEntry): Phase10LogEntry {
  return {
    ...entry,
    metadata: entry.metadata ? (redactValue(entry.metadata) as Record<string, unknown>) : undefined,
  };
}

export function createPhase10Logger(sink: (entry: Phase10LogEntry) => void) {
  return {
    audit(entry: Phase10LogEntry) {
      sink(sanitizePhase10LogEntry(entry));
    },
  };
}
