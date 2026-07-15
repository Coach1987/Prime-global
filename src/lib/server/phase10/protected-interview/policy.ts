import type { InterviewParticipantRole, InterviewRecord } from "./types.ts";

const CONTACT_PATTERN = /(@|https?:\/\/|www\.|\+\d{7,}|telegram|whatsapp|signal|zoom\.us|meet\.google|teams\.microsoft)/i;

export function containsExternalContactOrLink(value: string): boolean {
  return CONTACT_PATTERN.test(value);
}

export function enforceInterviewPolicy(input: {
  interview: InterviewRecord;
  participantRole?: InterviewParticipantRole;
  action: "reserve" | "activate" | "join" | "close" | "expire" | "cancel";
  metadata?: Record<string, unknown>;
}): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (input.action === "reserve" && !input.interview.policyApproved) {
    reasons.push("No room before approval.");
  }

  if (input.action === "join") {
    if (input.interview.state !== "interview_activated" && input.interview.state !== "interview_started") {
      reasons.push("No candidate or employer join before activation.");
    }

    if (input.participantRole && !["Candidate", "Employer", "Prime Recruiter", "Prime Admin", "Observer"].includes(input.participantRole)) {
      reasons.push("No third-party participant.");
    }
  }

  if (input.action === "activate" && input.interview.state === "closed") {
    reasons.push("No room reuse after closure.");
  }

  const maybeText = JSON.stringify(input.metadata ?? {});
  if (containsExternalContactOrLink(maybeText)) {
    reasons.push("No external meeting links or contact information.");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export function validateOrganizationScope(interview: InterviewRecord, organizationId: string): boolean {
  return interview.organizationId === organizationId;
}

export function authorizeParticipantRole(role: InterviewParticipantRole): boolean {
  return ["Candidate", "Employer", "Prime Recruiter", "Prime Admin", "Observer"].includes(role);
}
