export function getCoordinationText(locale: string) {
  if (locale === "ar") return "تُنسَّق هذه المقابلة حصريًا من خلال برايم جلوبال.";
  return "This interview is coordinated exclusively by Prime Global.";
}

export function evaluateConversationAccess(input: {
  role: "candidate" | "employer" | "staff" | "unknown";
  isConversationMember: boolean;
  sameOrganization: boolean;
}) {
  if (input.role === "unknown") return { allowed: false, reason: "unauthorized" };
  if (!input.sameOrganization) return { allowed: false, reason: "cross_organization" };
  if (!input.isConversationMember && input.role !== "staff") return { allowed: false, reason: "not_member" };
  return { allowed: true, reason: "ok" };
}

export function canViewStaffNotes(role: "candidate" | "employer" | "staff" | "unknown") {
  return role === "staff";
}

export function evaluateConversationGates(input: {
  companyAuthenticated: boolean;
  candidateAuthenticated: boolean;
  protectedProfileAuthorized: boolean;
  workflowAllowsCommunication: boolean;
  hasCorrectJobApplicationScope: boolean;
  hasActiveStaffFreeze: boolean;
}) {
  const denied =
    !input.companyAuthenticated ||
    !input.candidateAuthenticated ||
    !input.protectedProfileAuthorized ||
    !input.workflowAllowsCommunication ||
    !input.hasCorrectJobApplicationScope ||
    input.hasActiveStaffFreeze;

  return {
    allowed: !denied,
    reason: denied ? "conversation_gate_failed" : "ok",
  };
}

export function evaluateInterviewActivation(input: {
  candidateSelected: boolean;
  invitationAccepted: boolean;
  employerAcceptedLatestTerms: boolean;
  candidateAcceptedLatestTerms: boolean;
  staffApproved: boolean;
  scheduleValid: boolean;
  activeFreeze: boolean;
  criticalProtectionIssue: boolean;
  workflowScopeValid: boolean;
  organizationScopeValid: boolean;
  externalMeetingLinkPresent: boolean;
  thirdPartyParticipantPresent: boolean;
  roomPreviouslyClosed: boolean;
}) {
  const blocked =
    !input.candidateSelected ||
    !input.invitationAccepted ||
    !input.employerAcceptedLatestTerms ||
    !input.candidateAcceptedLatestTerms ||
    !input.staffApproved ||
    !input.scheduleValid ||
    input.activeFreeze ||
    input.criticalProtectionIssue ||
    !input.workflowScopeValid ||
    !input.organizationScopeValid ||
    input.externalMeetingLinkPresent ||
    input.thirdPartyParticipantPresent ||
    input.roomPreviouslyClosed;

  return {
    allowed: !blocked,
    reason: blocked ? "activation_gate_failed" : "ok",
  };
}

export function canJoinRoom(input: {
  activated: boolean;
  authorized: boolean;
  tokenExpiresAt: string;
  nowIso: string;
  tokenUsed: boolean;
}) {
  if (!input.authorized) return { allowed: false, reason: "unauthorized" };
  if (!input.activated) return { allowed: false, reason: "not_activated" };
  if (input.tokenUsed) return { allowed: false, reason: "token_used" };
  if (new Date(input.tokenExpiresAt).getTime() <= new Date(input.nowIso).getTime()) return { allowed: false, reason: "token_expired" };
  return { allowed: true, reason: "ok" };
}
