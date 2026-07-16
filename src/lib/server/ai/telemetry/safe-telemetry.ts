import type { AiError, AiTelemetryRecord } from "../contracts/types.ts";
import { redactSensitiveText } from "../safety/pii-redaction.ts";

type AllowedTelemetry = Pick<
  AiTelemetryRecord,
  | "requestId"
  | "correlationId"
  | "taskType"
  | "provider"
  | "model"
  | "latencyMs"
  | "retriesUsed"
  | "fallbackDepth"
  | "inputTokens"
  | "outputTokens"
  | "totalTokens"
  | "errorCode"
  | "policyVersion"
  | "promptVersion"
  | "schemaVersion"
  | "redactionApplied"
  | "timestamp"
> & {
  status: "success" | "failure";
};

const SECRET_PATTERN = /(api[_-]?key|token|secret|password|authorization)/gi;

function cleanString(value?: string): string | undefined {
  if (!value) return undefined;
  const redacted = redactSensitiveText(value, "restricted").redactedText;
  return redacted.replace(SECRET_PATTERN, "[REDACTED_SECRET]");
}

export function createSafeTelemetryRecord(input: {
  requestId: string;
  correlationId?: string;
  taskType: AllowedTelemetry["taskType"];
  provider: AllowedTelemetry["provider"];
  model: string;
  status: AllowedTelemetry["status"];
  latencyMs: number;
  retriesUsed: number;
  fallbackDepth: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  errorCode?: AiError["code"];
  policyVersion: string;
  promptVersion: string;
  schemaVersion?: string;
  redactionApplied: boolean;
  timestamp?: string;
}): AllowedTelemetry {
  return {
    requestId: cleanString(input.requestId) ?? "unknown-request",
    correlationId: cleanString(input.correlationId),
    taskType: input.taskType,
    provider: input.provider,
    model: cleanString(input.model) ?? "unknown-model",
    status: input.status,
    latencyMs: input.latencyMs,
    retriesUsed: input.retriesUsed,
    fallbackDepth: input.fallbackDepth,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.totalTokens,
    errorCode: input.errorCode,
    policyVersion: cleanString(input.policyVersion) ?? "unknown-policy",
    promptVersion: cleanString(input.promptVersion) ?? "unknown-prompt",
    schemaVersion: cleanString(input.schemaVersion),
    redactionApplied: input.redactionApplied,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

export function hasForbiddenTelemetryContent(record: Record<string, unknown>): boolean {
  const values = Object.values(record)
    .filter((value): value is string => typeof value === "string")
    .join(" ");

  const lower = values.toLowerCase();
  const hasLikelyPhone =
    /(?:\+\d[\d\s().-]{7,}\d)/.test(values) ||
    /(?:phone|mobile|tel|whatsapp|اتصل|هاتف)\s*[:=-]?\s*[0-9٠-٩+().\s-]{7,}/i.test(values);

  return (
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(values) ||
    hasLikelyPhone ||
    /(address|العنوان|street|شارع)/i.test(values) ||
    /(passport|national id|رقم الهوية|جواز)/i.test(values) ||
    /(candidate-private|storage\/v1\/object|signed-contracts)/i.test(values) ||
    /(\bapi[_-]?key\b|\btoken=|\bauthorization\b|\bpassword\b)/i.test(lower)
  );
}

export type { AllowedTelemetry };