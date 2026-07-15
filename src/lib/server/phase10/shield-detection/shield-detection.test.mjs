import test from "node:test";
import assert from "node:assert/strict";
import { classifyShieldDetectionExperience, PHASE10_SHIELD_FRIENDLY_REMINDER } from "./index.ts";

test("low confidence remains normal with no interruption", () => {
  const plan = classifyShieldDetectionExperience({
    signalType: "possible_phone",
    confidenceBand: "low",
    confidenceScore: 0.2,
    repeatedConfirmedAttempts: 0,
    detector: "contact-detector",
  });

  assert.equal(plan.level, 0);
  assert.equal(plan.showUserMessage, false);
  assert.equal(plan.notifyPolicyEngine, false);
  assert.equal(plan.automaticPenalty, "none");
});

test("medium confidence is observe-only", () => {
  const plan = classifyShieldDetectionExperience({
    signalType: "possible_external_link",
    confidenceBand: "medium",
    confidenceScore: 0.5,
    repeatedConfirmedAttempts: 1,
    detector: "link-detector",
  });

  assert.equal(plan.level, 1);
  assert.equal(plan.internalLogOnly, true);
  assert.equal(plan.showUserMessage, false);
  assert.equal(plan.notifyPolicyEngine, false);
});

test("high confidence gives friendly reminder with edit-and-continue", () => {
  const plan = classifyShieldDetectionExperience({
    signalType: "possible_email",
    confidenceBand: "high",
    confidenceScore: 0.82,
    repeatedConfirmedAttempts: 1,
    detector: "contact-detector",
  });

  assert.equal(plan.level, 2);
  assert.equal(plan.showUserMessage, true);
  assert.equal(plan.userMessage, PHASE10_SHIELD_FRIENDLY_REMINDER);
  assert.equal(plan.allowEditAndContinue, true);
  assert.equal(plan.notifyPolicyEngine, false);
});

test("very high confidence repeated attempts escalate to policy and rule engines", () => {
  const plan = classifyShieldDetectionExperience({
    signalType: "possible_circumvention",
    confidenceBand: "very_high",
    confidenceScore: 0.97,
    repeatedConfirmedAttempts: 3,
    detector: "circumvention-detector",
    excerptReference: "msg:123",
  });

  assert.equal(plan.level, 3);
  assert.equal(plan.notifyPolicyEngine, true);
  assert.equal(plan.notifyRuleEngine, true);
  assert.equal(plan.appendEvidenceReference, true);
  assert.equal(plan.automaticPenalty, "none");
});
