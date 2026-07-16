import test from "node:test";
import assert from "node:assert/strict";

import { buildSafeProviderPayload } from "../safety/request-safety.ts";

function baseRequest(overrides = {}) {
  return {
    taskType: "candidate_rescoring",
    capability: "generate_json",
    prompt: "Contact me at john@example.com",
    promptRef: { id: "candidate.rescore", version: "v1" },
    piiSensitivity: "restricted",
    allowExternalProviders: false,
    context: {
      requestId: "req-safe-1",
      correlationId: "corr-safe-1",
      actorType: "system",
      environment: "test",
    },
    ...overrides,
  };
}

test("restricted task defaults to fail-closed local policy", () => {
  delete process.env.AI_ENGINE_EXTERNAL_PROVIDERS_ENABLED;
  delete process.env.AI_ENGINE_LOCAL_ONLY_MODE;
  delete process.env.AI_ENGINE_FAIL_CLOSED_FOR_HIGH_SENSITIVITY;

  const result = buildSafeProviderPayload(baseRequest());
  assert.equal(result.ok, true);
  assert.equal(result.payload.provider, "local_llm");
  assert.equal(result.payload.request.allowExternalProviders, false);
});

test("external provider rejection when request forbids external execution", () => {
  process.env.AI_ENGINE_EXTERNAL_PROVIDERS_ENABLED = "true";
  process.env.AI_ENGINE_LOCAL_ONLY_MODE = "false";

  const result = buildSafeProviderPayload(
    baseRequest({
      taskType: "profile_rewrite",
      capability: "generate_text",
      piiSensitivity: "medium",
      allowExternalProviders: false,
    })
  );

  assert.equal(result.ok, false);
  assert.equal(result.error?.code, "AI_POLICY_BLOCKED");
});

test("safe payload preserves request and correlation IDs and redacts prompt", () => {
  const result = buildSafeProviderPayload(baseRequest());
  assert.equal(result.ok, true);
  assert.equal(result.payload.request.context.requestId, "req-safe-1");
  assert.equal(result.payload.request.context.correlationId, "corr-safe-1");
  assert.ok(result.payload.request.prompt.includes("[REDACTED_EMAIL]"));
});