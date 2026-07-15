import test from "node:test";
import assert from "node:assert/strict";
import {
  canActivateSupervisedConversation,
  detectRecruitmentContactModeration,
} from "./guardrails.ts";

test("detectRecruitmentContactModeration approves neutral professional content", () => {
  const result = detectRecruitmentContactModeration("We reviewed your experience and would like to discuss the role requirements.");

  assert.equal(result.state, "approved");
  assert.equal(result.containsContactAttempt, false);
  assert.deepEqual(result.reasons, []);
});

test("detectRecruitmentContactModeration flags direct contact details and external links", () => {
  const result = detectRecruitmentContactModeration(
    "Please email me at person@example.com or join https://meet.google.com/demo later."
  );

  assert.equal(result.state, "requires_review");
  assert.equal(result.containsContactAttempt, true);
  assert.ok(result.reasons.includes("email"));
  assert.ok(result.reasons.includes("meeting_link"));
});

test("canActivateSupervisedConversation requires employer candidate and staff participants", () => {
  const active = canActivateSupervisedConversation({
    employerAuthUserId: "employer-auth-id",
    candidateAuthUserId: "candidate-auth-id",
    assignedStaffId: "staff-auth-id",
    participants: [
      { participant_role: "employer", participation_status: "active" },
      { participant_role: "candidate", participation_status: "active" },
      { participant_role: "prime_global_staff", participation_status: "active" },
    ],
  });

  const missingStaff = canActivateSupervisedConversation({
    employerAuthUserId: "employer-auth-id",
    candidateAuthUserId: "candidate-auth-id",
    assignedStaffId: null,
    participants: [
      { participant_role: "employer", participation_status: "active" },
      { participant_role: "candidate", participation_status: "active" },
    ],
  });

  assert.equal(active, true);
  assert.equal(missingStaff, false);
});