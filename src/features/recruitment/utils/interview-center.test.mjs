import test from "node:test";
import assert from "node:assert/strict";

import {
  canEmployerRequestInterview,
  enforceInPlatformMeetingOnly,
  getInterviewCenterPermissions,
} from "./interview-center.ts";

test("employer interview request requires selected candidate", () => {
  const denied = canEmployerRequestInterview({
    role: "employer",
    conversationStatus: "active",
    hasRelatedApplication: false,
  });

  const allowed = canEmployerRequestInterview({
    role: "employer",
    conversationStatus: "active",
    hasRelatedApplication: true,
  });

  assert.equal(denied.allowed, false);
  assert.match(denied.reason, /selection/i);
  assert.equal(allowed.allowed, true);
});

test("meeting center blocks external contacts and links in chat", () => {
  const blocked = enforceInPlatformMeetingOnly({ body: "Join me on zoom.us/abc or email me at person@example.com" });
  const allowed = enforceInPlatformMeetingOnly({ body: "Looking forward to the interview in Prime Global." });

  assert.equal(blocked.allowed, false);
  assert.match(blocked.reason, /blocked/i);
  assert.equal(allowed.allowed, true);
});

test("interview center permissions are role-based", () => {
  const staff = getInterviewCenterPermissions({ role: "staff", interviewStatus: "live" });
  const candidate = getInterviewCenterPermissions({ role: "candidate", interviewStatus: "live" });

  assert.equal(staff.canModerateMeeting, true);
  assert.equal(staff.canStartOrEndMeeting, true);
  assert.equal(candidate.canModerateMeeting, false);
  assert.equal(candidate.canStartOrEndMeeting, false);
  assert.equal(candidate.canJoinMeeting, true);
});

test("interview join/chat permissions are disabled when interview is completed", () => {
  const completed = getInterviewCenterPermissions({ role: "employer", interviewStatus: "completed" });
  assert.equal(completed.canJoinMeeting, false);
  assert.equal(completed.canSendChat, false);
});
