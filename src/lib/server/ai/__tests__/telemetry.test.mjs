import test from "node:test";
import assert from "node:assert/strict";

import { createSafeTelemetryRecord, hasForbiddenTelemetryContent } from "../telemetry/safe-telemetry.ts";

test("safe telemetry contains only non-sensitive allowlisted values", () => {
  const record = createSafeTelemetryRecord({
    requestId: "req-123",
    correlationId: "corr-456",
    taskType: "recommendations",
    provider: "mock",
    model: "mock-v1",
    status: "success",
    latencyMs: 25,
    retriesUsed: 0,
    fallbackDepth: 0,
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    policyVersion: "milestone2-v1",
    promptVersion: "v3",
    schemaVersion: "v1",
    redactionApplied: true,
  });

  assert.equal(record.taskType, "recommendations");
  assert.equal(record.provider, "mock");
  assert.equal(hasForbiddenTelemetryContent(record), false);
});

test("forbidden values are not retained in telemetry strings", () => {
  const record = createSafeTelemetryRecord({
    requestId: "john@example.com",
    correlationId: "token=secret",
    taskType: "cv_extract",
    provider: "mock",
    model: "model api_key",
    status: "failure",
    latencyMs: 1,
    retriesUsed: 0,
    fallbackDepth: 0,
    errorCode: "AI_POLICY_BLOCKED",
    policyVersion: "policy-1",
    promptVersion: "prompt-1",
    redactionApplied: true,
  });

  assert.equal(hasForbiddenTelemetryContent(record), false);
});