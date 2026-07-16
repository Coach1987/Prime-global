import test from "node:test";
import assert from "node:assert/strict";

import { buildMessagePersistencePlan, protectRecruitmentMessage } from "./message-protection.ts";

test("protected message projection masks direct contact", async () => {
  const result = await protectRecruitmentMessage({
    messageId: "m-1",
    messageText: "Call me on +1 212 555 1212 and email me a@b.com",
    conversationId: "c-1",
    actorRole: "candidate",
  });

  assert.equal(result.hadProtection, true);
  assert.match(result.protectedText, /\[protected-phone\]|\[protected-email\]/);
});

test("external meeting-link protection", async () => {
  const result = await protectRecruitmentMessage({
    messageId: "m-2",
    messageText: "Join https://zoom.us/j/123456 now",
    conversationId: "c-1",
    actorRole: "employer",
  });

  assert.equal(result.hadProtection, true);
  assert.match(result.protectedText, /\[protected-meeting-link\]/);
});

test("safe message continues without protection", async () => {
  const result = await protectRecruitmentMessage({
    messageId: "m-3",
    messageText: "Looking forward to our interview in platform.",
    conversationId: "c-1",
    actorRole: "candidate",
  });

  assert.equal(result.hadProtection, false);
});

test("original message privacy plan for protected content", () => {
  const plan = buildMessagePersistencePlan({ hadProtection: true });
  assert.equal(plan.preserveOriginalPrivately, true);
  assert.equal(plan.showProtectedProjection, true);
  assert.equal(plan.visibleToCounterparty, true);
});

test("original message privacy plan for safe content", () => {
  const plan = buildMessagePersistencePlan({ hadProtection: false });
  assert.equal(plan.preserveOriginalPrivately, false);
  assert.equal(plan.showProtectedProjection, false);
  assert.equal(plan.visibleToCounterparty, true);
});
