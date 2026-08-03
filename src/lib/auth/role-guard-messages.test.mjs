import test from "node:test";
import assert from "node:assert/strict";

import {
  EMPLOYER_BLOCKED_FROM_CANDIDATE_ACTIONS_MESSAGE,
  getEmployerBlockedFromCandidateActionsMessage,
} from "./role-guard-messages.ts";

test("returns exact English employer-block message", () => {
  assert.equal(
    getEmployerBlockedFromCandidateActionsMessage("en"),
    EMPLOYER_BLOCKED_FROM_CANDIDATE_ACTIONS_MESSAGE.en
  );
});

test("returns exact Arabic employer-block message", () => {
  assert.equal(
    getEmployerBlockedFromCandidateActionsMessage("ar"),
    EMPLOYER_BLOCKED_FROM_CANDIDATE_ACTIONS_MESSAGE.ar
  );
});

test("falls back to English for unsupported locales", () => {
  assert.equal(
    getEmployerBlockedFromCandidateActionsMessage("fr"),
    EMPLOYER_BLOCKED_FROM_CANDIDATE_ACTIONS_MESSAGE.en
  );
});
