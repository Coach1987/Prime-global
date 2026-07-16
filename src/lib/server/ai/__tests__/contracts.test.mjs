import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_TASK_POLICIES } from "../policies/task-policies.ts";

test("all required task policies are present", () => {
  const expected = [
    "cv_extract",
    "profile_rewrite",
    "recommendations",
    "matching_explanation",
    "skill_normalization",
    "pii_detection",
    "employer_summary",
    "candidate_rescoring",
  ];

  for (const task of expected) {
    assert.ok(DEFAULT_TASK_POLICIES[task], `missing policy for ${task}`);
    assert.equal(DEFAULT_TASK_POLICIES[task].taskType, task);
  }
});

test("deepseek appears in fallback chains where external fallback is defined", () => {
  assert.ok(DEFAULT_TASK_POLICIES.profile_rewrite.fallbackChain.includes("deepseek"));
  assert.ok(DEFAULT_TASK_POLICIES.recommendations.fallbackChain.includes("deepseek"));
  assert.ok(DEFAULT_TASK_POLICIES.matching_explanation.fallbackChain.includes("deepseek"));
  assert.ok(DEFAULT_TASK_POLICIES.employer_summary.fallbackChain.includes("deepseek"));
});