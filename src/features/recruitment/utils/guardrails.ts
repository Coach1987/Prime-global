export const PRIME_GLOBAL_STAFF_ROLE_VALUES = [
  "prime_global_recruiter",
  "prime_global_admin",
  "admin",
  "super_admin",
] as const;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}/;
const WHATSAPP_PATTERN = /\bwhats?app\b/i;
const TELEGRAM_PATTERN = /(?:\bt\.me\/|\btelegram\b|@[a-z0-9_]{5,})/i;
const SOCIAL_PATTERN = /\b(?:linkedin|facebook|instagram|x\.com|twitter|snapchat|tiktok)\.com\b/i;
const WEBSITE_PATTERN = /\b(?:https?:\/\/|www\.)[^\s]+/i;
const MEETING_PATTERN = /\b(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com|calendly\.com)\b/i;

export type ModerationReason =
  | "email"
  | "phone"
  | "whatsapp"
  | "telegram"
  | "social"
  | "website"
  | "meeting_link";

export interface MessageModerationResult {
  state: "approved" | "requires_review";
  reasons: ModerationReason[];
  containsContactAttempt: boolean;
}

export function detectRecruitmentContactModeration(content: string): MessageModerationResult {
  const text = content.trim();
  const reasons: ModerationReason[] = [];

  if (EMAIL_PATTERN.test(text)) reasons.push("email");
  if (PHONE_PATTERN.test(text)) reasons.push("phone");
  if (WHATSAPP_PATTERN.test(text)) reasons.push("whatsapp");
  if (TELEGRAM_PATTERN.test(text)) reasons.push("telegram");
  if (SOCIAL_PATTERN.test(text)) reasons.push("social");
  if (MEETING_PATTERN.test(text)) reasons.push("meeting_link");
  else if (WEBSITE_PATTERN.test(text)) reasons.push("website");

  return {
    state: reasons.length > 0 ? "requires_review" : "approved",
    reasons,
    containsContactAttempt: reasons.length > 0,
  };
}

export function canActivateSupervisedConversation(input: {
  employerAuthUserId?: string | null;
  candidateAuthUserId?: string | null;
  assignedStaffId?: string | null;
  participants: Array<{ participant_role: string; participation_status: string }>;
}) {
  const hasEmployer = input.participants.some(
    (participant) => participant.participant_role === "employer" && participant.participation_status === "active"
  );
  const hasCandidate = input.participants.some(
    (participant) => participant.participant_role === "candidate" && participant.participation_status === "active"
  );
  const hasStaff = input.participants.some(
    (participant) => participant.participant_role === "prime_global_staff" && participant.participation_status === "active"
  );

  return Boolean(input.employerAuthUserId && input.candidateAuthUserId && input.assignedStaffId && hasEmployer && hasCandidate && hasStaff);
}