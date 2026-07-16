import test from "node:test";
import assert from "node:assert/strict";

import { MockAiProviderAdapter } from "../adapters/mock/mock-adapter.ts";

function baseRequest(capability) {
  return {
    taskType: "recommendations",
    capability,
    prompt: "test",
    promptRef: { id: "recommendations.default", version: "v1" },
    piiSensitivity: "low",
    allowExternalProviders: false,
    context: {
      requestId: "req-1",
      actorType: "system",
      environment: "test",
    },
  };
}

test("mock adapter implements normalized generateJson contract", async () => {
  const adapter = new MockAiProviderAdapter();
  const response = await adapter.generateJson(baseRequest("generate_json"));

  assert.equal(response.ok, true);
  assert.equal(response.provider, "mock");
  assert.equal(response.capability, "generate_json");
  assert.equal(response.json.provider, "mock");
  assert.equal(response.metadata.promptRef.version, "v1");
});

test("unsupported capabilities return normalized error", async () => {
  const adapter = new MockAiProviderAdapter();
  const response = await adapter.generateJson(baseRequest("classify"));

  assert.equal(response.ok, false);
  assert.equal(response.error?.code, "AI_UNSUPPORTED_CAPABILITY");
  assert.equal(response.error?.retriable, false);
});