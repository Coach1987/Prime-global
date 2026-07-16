import { AppRole } from "@/lib/server/security/auth";
import {
  canActivateSupervisedConversation,
  detectRecruitmentContactModeration,
  MessageModerationResult,
  ModerationReason,
  PRIME_GLOBAL_STAFF_ROLE_VALUES,
} from "@/features/recruitment/utils/guardrails";
import {
  canEmployerRequestInterview as canEmployerRequestInterviewRule,
  enforceInPlatformMeetingOnly as enforceInPlatformMeetingOnlyRule,
  getInterviewCenterPermissions as getInterviewCenterPermissionsRule,
} from "@/features/recruitment/utils/interview-center";

export const PRIME_GLOBAL_STAFF_ROLES = PRIME_GLOBAL_STAFF_ROLE_VALUES;

export const RECRUITMENT_CONTACT_BLOCK_MESSAGE = {
  en: "This message contains direct contact information or an external communication link. Prime Global has held it for review.",
  ar: "تتضمن هذه الرسالة بيانات تواصل مباشرة أو رابط تواصل خارجي. قامت برايم جلوبال بحجزها للمراجعة.",
} as const;

export type ConversationParticipantRole = "employer" | "candidate" | "prime_global_staff";

export function isPrimeGlobalStaffRole(role: AppRole) {
  return (PRIME_GLOBAL_STAFF_ROLES as readonly string[]).includes(role);
}

export function moderateRecruitmentMessageContent(content: string): MessageModerationResult {
  return detectRecruitmentContactModeration(content);
}

export function getConversationParticipantRole(role: AppRole): ConversationParticipantRole {
  if (role === "employer") return "employer";
  if (role === "candidate") return "candidate";
  return "prime_global_staff";
}

export function getModerationHoldMessage(locale: string) {
  return locale === "ar" ? RECRUITMENT_CONTACT_BLOCK_MESSAGE.ar : RECRUITMENT_CONTACT_BLOCK_MESSAGE.en;
}

export { canActivateSupervisedConversation, type MessageModerationResult, type ModerationReason };
export const canEmployerRequestInterview = canEmployerRequestInterviewRule;
export const enforceInPlatformMeetingOnly = enforceInPlatformMeetingOnlyRule;
export const getInterviewCenterPermissions = getInterviewCenterPermissionsRule;