import test from "node:test";
import assert from "node:assert/strict";

import {
  canJoinRoom,
  canViewStaffNotes,
  evaluateConversationAccess,
  evaluateConversationGates,
  evaluateInterviewActivation,
  getCoordinationText,
} from "./chat-interview-rules.ts";

test("candidate access allowed when member and scoped", () => {
  const result = evaluateConversationAccess({ role: "candidate", isConversationMember: true, sameOrganization: true });
  assert.equal(result.allowed, true);
});

test("employer access allowed when member and scoped", () => {
  const result = evaluateConversationAccess({ role: "employer", isConversationMember: true, sameOrganization: true });
  assert.equal(result.allowed, true);
});

test("unauthorized denial", () => {
  const result = evaluateConversationAccess({ role: "unknown", isConversationMember: false, sameOrganization: true });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "unauthorized");
});

test("cross-organization denial", () => {
  const result = evaluateConversationAccess({ role: "candidate", isConversationMember: true, sameOrganization: false });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "cross_organization");
});

test("staff-note privacy", () => {
  assert.equal(canViewStaffNotes("staff"), true);
  assert.equal(canViewStaffNotes("candidate"), false);
  assert.equal(canViewStaffNotes("employer"), false);
});

test("conversation freeze gate blocks communication", () => {
  const result = evaluateConversationGates({
    companyAuthenticated: true,
    candidateAuthenticated: true,
    protectedProfileAuthorized: true,
    workflowAllowsCommunication: true,
    hasCorrectJobApplicationScope: true,
    hasActiveStaffFreeze: true,
  });
  assert.equal(result.allowed, false);
});

test("candidate selection required", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: false,
    invitationAccepted: true,
    employerAcceptedLatestTerms: true,
    candidateAcceptedLatestTerms: true,
    staffApproved: true,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: false,
  });
  assert.equal(result.allowed, false);
});

test("invitation acceptance required", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: true,
    invitationAccepted: false,
    employerAcceptedLatestTerms: true,
    candidateAcceptedLatestTerms: true,
    staffApproved: true,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: false,
  });
  assert.equal(result.allowed, false);
});

test("terms acceptance required", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: true,
    invitationAccepted: true,
    employerAcceptedLatestTerms: false,
    candidateAcceptedLatestTerms: true,
    staffApproved: true,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: false,
  });
  assert.equal(result.allowed, false);
});

test("activation denied before approval", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: true,
    invitationAccepted: true,
    employerAcceptedLatestTerms: true,
    candidateAcceptedLatestTerms: true,
    staffApproved: false,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: false,
  });
  assert.equal(result.allowed, false);
});

test("valid staff activation", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: true,
    invitationAccepted: true,
    employerAcceptedLatestTerms: true,
    candidateAcceptedLatestTerms: true,
    staffApproved: true,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: false,
  });
  assert.equal(result.allowed, true);
});

test("unauthorized room join", () => {
  const result = canJoinRoom({
    activated: true,
    authorized: false,
    tokenExpiresAt: "2099-01-01T00:00:00.000Z",
    nowIso: "2026-07-16T00:00:00.000Z",
    tokenUsed: false,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "unauthorized");
});

test("token expiry blocks join", () => {
  const result = canJoinRoom({
    activated: true,
    authorized: true,
    tokenExpiresAt: "2026-07-16T00:00:00.000Z",
    nowIso: "2026-07-16T00:05:00.000Z",
    tokenUsed: false,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "token_expired");
});

test("room reuse denial after closure", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: true,
    invitationAccepted: true,
    employerAcceptedLatestTerms: true,
    candidateAcceptedLatestTerms: true,
    staffApproved: true,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: true,
  });
  assert.equal(result.allowed, false);
});

test("cancellation condition represented by gate failure", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: true,
    invitationAccepted: false,
    employerAcceptedLatestTerms: true,
    candidateAcceptedLatestTerms: true,
    staffApproved: true,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: false,
  });
  assert.equal(result.allowed, false);
});

test("rescheduling still valid when schedule valid", () => {
  const result = evaluateInterviewActivation({
    candidateSelected: true,
    invitationAccepted: true,
    employerAcceptedLatestTerms: true,
    candidateAcceptedLatestTerms: true,
    staffApproved: true,
    scheduleValid: true,
    activeFreeze: false,
    criticalProtectionIssue: false,
    workflowScopeValid: true,
    organizationScopeValid: true,
    externalMeetingLinkPresent: false,
    thirdPartyParticipantPresent: false,
    roomPreviouslyClosed: false,
  });
  assert.equal(result.allowed, true);
});

test("bilingual coordination text", () => {
  assert.equal(getCoordinationText("en"), "This interview is coordinated exclusively by Prime Global.");
  assert.equal(getCoordinationText("ar"), "تُنسَّق هذه المقابلة حصريًا من خلال برايم جلوبال.");
});
