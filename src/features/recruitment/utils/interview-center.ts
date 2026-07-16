import { detectRecruitmentContactModeration } from "./guardrails.ts";

export function canEmployerRequestInterview(input: {
  role: "employer" | "candidate" | "staff";
  conversationStatus: string;
  hasRelatedApplication: boolean;
}): { allowed: boolean; reason: string } {
  if (input.role !== "employer") {
    return { allowed: false, reason: "Only employers may request interviews from this action." };
  }

  if (!input.hasRelatedApplication) {
    return { allowed: false, reason: "Candidate selection must be recorded before interview request." };
  }

  if (![
    "active",
    "paused",
  ].includes(input.conversationStatus)) {
    return { allowed: false, reason: "Interview requests are available only for supervised active or paused conversations." };
  }

  return { allowed: true, reason: "Eligible for interview request." };
}

export function enforceInPlatformMeetingOnly(input: { body: string }): { allowed: boolean; reason: string } {
  const moderation = detectRecruitmentContactModeration(input.body);
  if (moderation.containsContactAttempt) {
    return {
      allowed: false,
      reason: "Direct contacts and external links are blocked. Use Prime Global Interview Center only.",
    };
  }

  return { allowed: true, reason: "Message is allowed for supervised in-platform meeting communication." };
}

export function getInterviewCenterPermissions(input: {
  role: "employer" | "candidate" | "staff";
  interviewStatus: string;
}): {
  canJoinMeeting: boolean;
  canModerateMeeting: boolean;
  canSendChat: boolean;
  canStartOrEndMeeting: boolean;
} {
  const statusAllowsJoin = ["scheduled", "waiting", "live"].includes(input.interviewStatus);

  return {
    canJoinMeeting: statusAllowsJoin,
    canModerateMeeting: input.role === "staff",
    canSendChat: statusAllowsJoin,
    canStartOrEndMeeting: input.role === "staff",
  };
}
