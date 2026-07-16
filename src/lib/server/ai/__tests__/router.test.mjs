import test from "node:test";
import assert from "node:assert/strict";

import { resolveTaskPolicy } from "../routing/task-router.ts";

test("router resolves deterministic policy for every task", () => {
  const tasks = [
    "cv_extract",
    "profile_rewrite",
    "recommendations",
    "matching_explanation",
    "skill_normalization",
    "pii_detection",
    "employer_summary",
    "candidate_rescoring",
  ];

  for (const task of tasks) {
    const left = resolveTaskPolicy(task);
    const right = resolveTaskPolicy(task);
    assert.deepEqual(left, right, `${task} policy resolution must be deterministic`);
  }
});

test("high sensitivity policies are fail-closed by default", () => {
  delete process.env.AI_ENGINE_EXTERNAL_PROVIDERS_ENABLED;
  delete process.env.AI_ENGINE_LOCAL_ONLY_MODE;
  delete process.env.AI_ENGINE_FAIL_CLOSED_FOR_HIGH_SENSITIVITY;

  const policy = resolveTaskPolicy("candidate_rescoring");
  assert.equal(policy.primaryProvider, "local_llm");
  assert.equal(policy.allowExternalProviders, false);
  assert.equal(policy.localLlmPreference, "mandatory");
});