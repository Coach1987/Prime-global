import { createHash, randomUUID } from "node:crypto";
import { createAuditLog } from "@/lib/server/security/audit";
import { AppRole, AuthContext, forbiddenResponse } from "@/lib/server/security/auth";
import { serverEnv } from "@/lib/server/config/env";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { getCandidateByAuthUserId } from "@/lib/server/candidates";
import { evaluateCandidateProfileCompletion } from "@/lib/server/candidates/profile-completion";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { protectRecruitmentMessage } from "@/lib/server/recruitment/message-protection";
import { authorizeParticipantRole as protectedAuthorizeParticipantRole, enforceInterviewPolicy as enforceProtectedInterviewPolicy } from "@/lib/server/phase10/protected-interview/policy";
import type { InterviewParticipantRole as ProtectedInterviewParticipantRole, InterviewRecord as ProtectedInterviewRecord } from "@/lib/server/phase10/protected-interview/types";
import {
  canEmployerRequestInterview,
  enforceInPlatformMeetingOnly,
  getInterviewCenterPermissions,
  canActivateSupervisedConversation,
  getConversationParticipantRole,
  getModerationHoldMessage,
  isPrimeGlobalStaffRole,
  moderateRecruitmentMessageContent,
} from "@/lib/server/recruitment/supervised";

export interface RecruitmentActorContext {
  scope: "employer" | "candidate" | "staff";
  authUserId: string;
  role: AppRole;
  employerId?: string;
  candidateId?: string;
}

type NotificationInput = {
  authUserId: string;
  category: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
};

function getRepresentativeLabel(locale: string) {
  return locale === "ar" ? "ممثل برايم جلوبال المكلّف" : "Assigned Prime Global representative";
}

function getConversationBanner(locale: string) {
  return locale === "ar"
    ? "تخضع هذه المحادثة لإشراف برايم جلوبال. لا يُسمح بتبادل بيانات التواصل المباشر أو نقل التواصل خارج المنصة أثناء إجراءات التوظيف."
    : "This conversation is supervised by Prime Global. Direct contact information and communication outside the platform are not permitted during the recruitment process.";
}

function getAiSupervisorBanner(locale: string) {
  return locale === "ar"
    ? "مساعد برايم جلوبال الذكي يساعد مؤقتًا في هذه المحادثة الخاضعة للإشراف. تبقى القرارات النهائية للتوظيف خاضعة لمراجعة موظف برايم جلوبال."
    : "Prime Global AI Assistant is temporarily assisting this supervised conversation. Final recruitment decisions remain subject to Prime Global staff review.";
}

function getSupervisorSlaMinutes(conversation: Record<string, unknown>) {
  const fromConversation = Number(conversation.supervisor_sla_minutes ?? 0);
  if (Number.isFinite(fromConversation) && fromConversation > 0) {
    return Math.min(1440, Math.max(5, Math.floor(fromConversation)));
  }

  const fromEnv = Number(serverEnv.AI_SUPERVISOR_SLA_MINUTES ?? "30");
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.min(1440, Math.max(5, Math.floor(fromEnv)));
  }

  return 30;
}

function canPrimeGlobalAiPerformTask(taskType: string) {
  return [
    "process_qna",
    "candidate_job_summary",
    "availability_collection",
    "interview_suggestion",
    "reminder",
    "escalation",
    "handover_summary",
    "follow_up_task",
  ].includes(taskType);
}

function shouldSwitchToAiSupervised(conversation: Record<string, unknown>) {
  if (!conversation.assigned_staff_id) return false;
  const mode = String(conversation.conversation_mode ?? "staff_active");
  if (mode === "ai_supervised") return false;
  if (mode === "closed") return false;

  const baseline =
    conversation.staff_last_active_at ?? conversation.last_message_at ?? conversation.updated_at ?? null;
  if (!baseline) return true;

  const baselineTs = new Date(String(baseline)).getTime();
  if (!Number.isFinite(baselineTs)) return true;

  const slaMinutes = getSupervisorSlaMinutes(conversation);
  const elapsedMinutes = (Date.now() - baselineTs) / 60_000;
  return elapsedMinutes >= slaMinutes;
}

async function verifyPrimeStaffUser(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error || !data.user) {
    throw new Error(error?.message ?? "Assigned Prime Global staff member not found");
  }

  const rawRole = data.user.app_metadata?.app_role ?? data.user.user_metadata?.app_role;
  if (
    rawRole !== "prime_global_recruiter" &&
    rawRole !== "prime_global_admin" &&
    rawRole !== "admin" &&
    rawRole !== "super_admin"
  ) {
    throw new Error("Assigned user is not an authorized Prime Global staff member");
  }

  return data.user;
}

async function insertNotifications(supabase: ReturnType<typeof createSupabaseAdminClient>, inputs: NotificationInput[]) {
  if (inputs.length === 0) return;

  await supabase.from("notification_events").insert(
    inputs.map((item) => ({
      auth_user_id: item.authUserId,
      category: item.category,
      title: item.title,
      body: item.body,
      entity_type: item.entityType,
      entity_id: item.entityId,
      delivery_channels: ["dashboard", "realtime"],
    }))
  );

  await supabase.from("notifications").insert(
    inputs.map((item) => ({
      auth_user_id: item.authUserId,
      category: item.category,
      title: item.title,
      body: item.body,
      entity_type: item.entityType,
      entity_id: item.entityId,
    }))
  );
}

async function loadCandidatePublicProfiles(candidateIds: string[]) {
  if (candidateIds.length === 0) return new Map<string, Record<string, unknown>>();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_public_profiles")
    .select("candidate_id, candidate_reference, professional_title, professional_summary, general_location, desired_role, ai_summary, profile_status")
    .in("candidate_id", candidateIds);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((profile) => [String(profile.candidate_id), profile]));
}

async function loadEmployers(employerIds: string[]) {
  if (employerIds.length === 0) return new Map<string, Record<string, unknown>>();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("employers")
    .select("id, company_name, verification_status")
    .in("id", employerIds);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((employer) => [String(employer.id), employer]));
}

function mapConversationSummary(
  row: Record<string, unknown>,
  locale: string,
  candidateProfiles: Map<string, Record<string, unknown>>,
  employers: Map<string, Record<string, unknown>>
) {
  const candidateId = String(row.candidate_id ?? "");
  const employerId = String(row.employer_id ?? "");
  const candidateProfile = candidateProfiles.get(candidateId) ?? {};
  const employer = employers.get(employerId) ?? {};

  return {
    ...row,
    candidateProfile,
    employer,
    assignedStaff: {
      userId: row.assigned_staff_id,
      label: getRepresentativeLabel(locale),
    },
    supervisionNotice: getConversationBanner(locale),
    aiAssistanceNotice: getAiSupervisorBanner(locale),
    conversationMode: row.conversation_mode ?? "staff_active",
  };
}

export async function resolveRecruitmentActorContext(auth: AuthContext): Promise<RecruitmentActorContext> {
  if (auth.role === "employer") {
    const employer = await getEmployerByAuthUserId(auth.userId);
    if (!employer) {
      throw new Error("Employer profile missing");
    }

    return {
      scope: "employer",
      authUserId: auth.userId,
      role: auth.role,
      employerId: employer.id,
    };
  }

  if (auth.role === "candidate") {
    const candidate = await getCandidateByAuthUserId(auth.userId);
    if (!candidate) {
      throw new Error("Candidate profile missing");
    }

    return {
      scope: "candidate",
      authUserId: auth.userId,
      role: auth.role,
      candidateId: candidate.id,
    };
  }

  return {
    scope: "staff",
    authUserId: auth.userId,
    role: auth.role,
  };
}

export async function loadConversationForActor(auth: AuthContext, conversationId: string) {
  const actor = await resolveRecruitmentActorContext(auth);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("recruitment_conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Conversation not found");

  const isOwnerEmployer = actor.scope === "employer" && data.employer_auth_user_id === auth.userId;
  const isOwnerCandidate = actor.scope === "candidate" && data.candidate_auth_user_id === auth.userId;
  const isAssignedStaff = data.assigned_staff_id === auth.userId;
  const isElevatedStaff = actor.scope === "staff" && isPrimeGlobalStaffRole(auth.role);

  if (!isOwnerEmployer && !isOwnerCandidate && !isAssignedStaff && !isElevatedStaff) {
    throw new Error("Forbidden");
  }

  return { actor, conversation: data };
}

export async function createConversationRequestForEmployer(auth: AuthContext, input: {
  candidateId: string;
  relatedJobId?: string | null;
  relatedApplicationId?: string | null;
  requestedMessage: string;
  locale: string;
}) {
  const actor = await resolveRecruitmentActorContext(auth);
  if (actor.scope !== "employer") {
    throw new Error("Only employers may request conversations");
  }

  const supabase = createSupabaseAdminClient();
  const { data: candidateProfile, error: candidateProfileError } = await supabase
    .from("candidate_public_profiles")
    .select("candidate_id, candidate_reference, professional_title, profile_status")
    .eq("candidate_id", input.candidateId)
    .eq("profile_status", "approved")
    .maybeSingle();

  if (candidateProfileError) throw new Error(candidateProfileError.message);
  if (!candidateProfile) {
    throw new Error("Candidate profile is not approved for employer contact");
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id, auth_user_id")
    .eq("id", input.candidateId)
    .maybeSingle();

  if (candidateError) throw new Error(candidateError.message);
  if (!candidate?.auth_user_id) throw new Error("Candidate account missing");

  const { data: existing } = await supabase
    .from("recruitment_conversations")
    .select("id, status")
    .eq("employer_id", actor.employerId)
    .eq("candidate_id", input.candidateId)
    .in("status", ["pending_candidate_acceptance", "active", "paused"])
    .maybeSingle();

  if (existing) {
    throw new Error("A supervised conversation already exists for this employer and candidate");
  }

  const { data, error } = await supabase
    .from("recruitment_conversation_requests")
    .insert({
      employer_id: actor.employerId,
      employer_auth_user_id: auth.userId,
      candidate_id: input.candidateId,
      candidate_auth_user_id: candidate.auth_user_id,
      related_job_id: input.relatedJobId ?? null,
      related_application_id: input.relatedApplicationId ?? null,
      requested_message: input.requestedMessage,
      status: "pending_prime_global_assignment",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.conversation_request.created",
    targetType: "recruitment_conversation_request",
    targetId: data.id,
    metadata: {
      employerId: actor.employerId,
      candidateId: input.candidateId,
      relatedJobId: input.relatedJobId ?? null,
      relatedApplicationId: input.relatedApplicationId ?? null,
    },
  });

  return {
    ...data,
    candidateProfile,
    assignedStaff: {
      userId: null,
      label: getRepresentativeLabel(input.locale),
    },
    supervisionNotice: getConversationBanner(input.locale),
  };
}

export async function listConversationRequestsForActor(auth: AuthContext, locale: string) {
  const actor = await resolveRecruitmentActorContext(auth);
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("recruitment_conversation_requests").select("*").order("created_at", { ascending: false });

  if (actor.scope === "employer") {
    query = query.eq("employer_auth_user_id", auth.userId);
  } else if (actor.scope === "candidate") {
    query = query.eq("candidate_auth_user_id", auth.userId);
  } else if (auth.role === "prime_global_recruiter") {
    query = query.or(`assigned_staff_user_id.eq.${auth.userId},status.eq.pending_prime_global_assignment,status.eq.pending_staff_review`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const candidateProfiles = await loadCandidatePublicProfiles(Array.from(new Set((data ?? []).map((row) => String(row.candidate_id ?? "")))));
  const employers = await loadEmployers(Array.from(new Set((data ?? []).map((row) => String(row.employer_id ?? "")))));

  return (data ?? []).map((row) => mapConversationSummary(row, locale, candidateProfiles, employers));
}

export async function reviewConversationRequest(auth: AuthContext, requestId: string, input: {
  action: "assign" | "approve" | "reject";
  assignedStaffUserId?: string;
  rejectionReason?: string;
  locale: string;
}) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may review conversation requests");
  }

  const supabase = createSupabaseAdminClient();
  const { data: request, error } = await supabase
    .from("recruitment_conversation_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!request) throw new Error("Conversation request not found");

  const staffUserId = input.assignedStaffUserId ?? request.assigned_staff_user_id ?? auth.userId;
  await verifyPrimeStaffUser(staffUserId);

  if (input.action === "assign") {
    const { data: updated, error: updateError } = await supabase
      .from("recruitment_conversation_requests")
      .update({
        assigned_staff_user_id: staffUserId,
        reviewed_by_staff_user_id: auth.userId,
        reviewed_at: new Date().toISOString(),
        status: "pending_staff_review",
      })
      .eq("id", requestId)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "recruitment.conversation_request.assigned",
      targetType: "recruitment_conversation_request",
      targetId: requestId,
      metadata: { assignedStaffUserId: staffUserId },
    });

    return updated;
  }

  if (input.action === "reject") {
    const { data: updated, error: updateError } = await supabase
      .from("recruitment_conversation_requests")
      .update({
        assigned_staff_user_id: staffUserId,
        reviewed_by_staff_user_id: auth.userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: input.rejectionReason ?? null,
        status: "rejected",
      })
      .eq("id", requestId)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);

    await insertNotifications(supabase, [
      {
        authUserId: String(request.employer_auth_user_id),
        category: "message",
        title: input.locale === "ar" ? "تم رفض طلب المحادثة" : "Conversation request rejected",
        body: input.rejectionReason ?? (input.locale === "ar" ? "راجعت برايم جلوبال الطلب ورفضته." : "Prime Global reviewed and rejected the request."),
        entityType: "recruitment_conversation_request",
        entityId: requestId,
      },
    ]);

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "recruitment.conversation_request.rejected",
      targetType: "recruitment_conversation_request",
      targetId: requestId,
      metadata: { rejectionReason: input.rejectionReason ?? null },
    });

    return updated;
  }

  const now = new Date().toISOString();
  const { data: existingConversation } = await supabase
    .from("recruitment_conversations")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  let conversationId = existingConversation?.id as string | undefined;

  if (!conversationId) {
    const { data: conversation, error: conversationError } = await supabase
      .from("recruitment_conversations")
      .insert({
        request_id: requestId,
        employer_id: request.employer_id,
        employer_auth_user_id: request.employer_auth_user_id,
        candidate_id: request.candidate_id,
        candidate_auth_user_id: request.candidate_auth_user_id,
        assigned_staff_id: staffUserId,
        related_job_id: request.related_job_id,
        related_application_id: request.related_application_id,
        status: "pending_candidate_acceptance",
        recruitment_stage: "candidate_review",
      })
      .select("*")
      .single();

    if (conversationError) throw new Error(conversationError.message);
    conversationId = conversation.id;

    const participants = [
      { conversation_id: conversationId, auth_user_id: request.employer_auth_user_id, participant_role: "employer", participation_status: "active" },
      { conversation_id: conversationId, auth_user_id: request.candidate_auth_user_id, participant_role: "candidate", participation_status: "invited" },
      { conversation_id: conversationId, auth_user_id: staffUserId, participant_role: "prime_global_staff", participation_status: "active" },
    ];

    const { error: participantError } = await supabase.from("recruitment_conversation_participants").insert(participants);
    if (participantError) throw new Error(participantError.message);

    const { error: systemMessageError } = await supabase.from("recruitment_messages").insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: "system",
      message_type: "system",
      body:
        input.locale === "ar"
          ? "وافقت برايم جلوبال على الطلب بانتظار تأكيد المرشح. تبقى المحادثة خاضعة للإشراف طوال العملية."
          : "Prime Global approved this request. The conversation is waiting for candidate acceptance and remains supervised throughout the process.",
    });

    if (systemMessageError) throw new Error(systemMessageError.message);
  } else {
    await supabase
      .from("recruitment_conversations")
      .update({ assigned_staff_id: staffUserId, updated_at: now })
      .eq("id", conversationId);
  }

  if (!conversationId) {
    throw new Error("Conversation creation failed");
  }

  const { data: updatedRequest, error: requestUpdateError } = await supabase
    .from("recruitment_conversation_requests")
    .update({
      assigned_staff_user_id: staffUserId,
      reviewed_by_staff_user_id: auth.userId,
      reviewed_at: now,
      status: "approved",
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (requestUpdateError) throw new Error(requestUpdateError.message);

  await insertNotifications(supabase, [
    {
      authUserId: String(request.candidate_auth_user_id),
      category: "message",
      title: input.locale === "ar" ? "دعوة إلى محادثة خاضعة للإشراف" : "Invitation to a supervised conversation",
      body: input.locale === "ar" ? "وافقت برايم جلوبال على طلب تواصل جديد. يمكنك القبول أو الرفض داخل المنصة." : "Prime Global approved a new contact request. You can accept or decline it inside the platform.",
      entityType: "recruitment_conversation",
      entityId: conversationId,
    },
    {
      authUserId: String(request.employer_auth_user_id),
      category: "message",
      title: input.locale === "ar" ? "تمت الموافقة على طلب المحادثة" : "Conversation request approved",
      body: input.locale === "ar" ? "وافقت برايم جلوبال على الطلب بانتظار موافقة المرشح." : "Prime Global approved the request and is waiting for candidate acceptance.",
      entityType: "recruitment_conversation",
      entityId: conversationId,
    },
  ]);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.conversation_request.approved",
    targetType: "recruitment_conversation_request",
    targetId: requestId,
    metadata: { conversationId, assignedStaffUserId: staffUserId },
  });

  return {
    request: updatedRequest,
    conversationId,
  };
}

export async function listConversationsForActor(auth: AuthContext, locale: string) {
  const actor = await resolveRecruitmentActorContext(auth);
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("recruitment_conversations").select("*").order("updated_at", { ascending: false });

  if (actor.scope === "employer") {
    query = query.eq("employer_auth_user_id", auth.userId);
  } else if (actor.scope === "candidate") {
    query = query.eq("candidate_auth_user_id", auth.userId);
  } else if (auth.role === "prime_global_recruiter") {
    query = query.eq("assigned_staff_id", auth.userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const conversationIds = (data ?? []).map((row) => String(row.id));
  const [participantsResult, latestMessagesResult] = await Promise.all([
    supabase
      .from("recruitment_conversation_participants")
      .select("conversation_id, auth_user_id, participant_role, participation_status, updated_at")
      .in("conversation_id", conversationIds.length > 0 ? conversationIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("recruitment_messages")
      .select("conversation_id, created_at")
      .in("conversation_id", conversationIds.length > 0 ? conversationIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false }),
  ]);

  if (participantsResult.error) throw new Error(participantsResult.error.message);
  if (latestMessagesResult.error) throw new Error(latestMessagesResult.error.message);

  const participantsByConversation = new Map<string, Array<Record<string, unknown>>>();
  for (const participant of participantsResult.data ?? []) {
    const key = String(participant.conversation_id);
    participantsByConversation.set(key, [...(participantsByConversation.get(key) ?? []), participant]);
  }

  const latestMessageAtByConversation = new Map<string, string>();
  for (const message of latestMessagesResult.data ?? []) {
    const key = String(message.conversation_id);
    if (!latestMessageAtByConversation.has(key)) {
      latestMessageAtByConversation.set(key, String(message.created_at ?? ""));
    }
  }
  const { data: interviews, error: interviewsError } = await supabase
    .from("recruitment_interviews")
    .select("id, conversation_id, status, scheduled_at")
    .in("conversation_id", conversationIds.length > 0 ? conversationIds : ["00000000-0000-0000-0000-000000000000"]);
  if (interviewsError) throw new Error(interviewsError.message);

  const interviewSummaryByConversation = new Map<string, { pendingInvitations: number; nextInterviewAt: string | null }>();
  for (const row of interviews ?? []) {
    const conversationId = String(row.conversation_id);
    const existing = interviewSummaryByConversation.get(conversationId) ?? { pendingInvitations: 0, nextInterviewAt: null };
    if (["scheduled", "waiting"].includes(String(row.status ?? ""))) {
      existing.pendingInvitations += 1;
      const scheduledAt = String(row.scheduled_at ?? "");
      if (!existing.nextInterviewAt || scheduledAt < existing.nextInterviewAt) {
        existing.nextInterviewAt = scheduledAt;
      }
    }
    interviewSummaryByConversation.set(conversationId, existing);
  }

  const candidateProfiles = await loadCandidatePublicProfiles(Array.from(new Set((data ?? []).map((row) => String(row.candidate_id ?? "")))));
  const employers = await loadEmployers(Array.from(new Set((data ?? []).map((row) => String(row.employer_id ?? "")))));

  return (data ?? []).map((row) => ({
    ...mapConversationSummary(row, locale, candidateProfiles, employers),
    participantRoles: (participantsByConversation.get(String(row.id)) ?? []).map((participant) => String(participant.participant_role ?? "participant")),
    recruiterPresence:
      new Date(String(row.staff_last_active_at ?? row.updated_at ?? row.created_at ?? "")).getTime() > Date.now() - 5 * 60_000
        ? "online"
        : "offline",
    unread:
      (() => {
        const participant = (participantsByConversation.get(String(row.id)) ?? []).find((entry) => String(entry.auth_user_id) === auth.userId);
        const seenAt = new Date(String(participant?.updated_at ?? row.created_at ?? "")).getTime();
        const latestAt = new Date(String(latestMessageAtByConversation.get(String(row.id)) ?? row.created_at ?? "")).getTime();
        const hasUnread = Number.isFinite(seenAt) && Number.isFinite(latestAt) ? latestAt > seenAt : false;
        return { hasUnread, unreadCount: hasUnread ? 1 : 0 };
      })(),
    lastMessageAt: latestMessageAtByConversation.get(String(row.id)) ?? null,
    interviewSummary: interviewSummaryByConversation.get(String(row.id)) ?? { pendingInvitations: 0, nextInterviewAt: null },
  }));
}

export async function getConversationDetail(auth: AuthContext, conversationId: string, locale: string) {
  const { actor, conversation } = await loadConversationForActor(auth, conversationId);
  const supabase = createSupabaseAdminClient();

  const participantRole = getConversationParticipantRole(auth.role);
  if (actor.scope !== "staff") {
    await supabase
      .from("recruitment_conversation_participants")
      .update({ updated_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("participant_role", participantRole)
      .eq("auth_user_id", auth.userId);
  }

  const [messagesResult, attachmentsResult, participantsResult, notesResult, interviewsResult, aiHandoverResult] = await Promise.all([
    supabase.from("recruitment_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }),
    supabase
      .from("recruitment_message_attachments")
      .select("*")
      .in(
        "message_id",
        (
          (
            await supabase.from("recruitment_messages").select("id").eq("conversation_id", conversationId)
          ).data ?? []
        ).map((item) => item.id)
      ),
    supabase.from("recruitment_conversation_participants").select("*").eq("conversation_id", conversationId),
    actor.scope === "staff"
      ? supabase.from("recruitment_internal_notes").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("recruitment_interviews").select("*").eq("conversation_id", conversationId).order("scheduled_at", { ascending: true }),
    supabase
      .from("recruitment_ai_handover_summaries")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (attachmentsResult.error) throw new Error(attachmentsResult.error.message);
  if (participantsResult.error) throw new Error(participantsResult.error.message);
  if (notesResult.error) throw new Error(notesResult.error.message);
  if (interviewsResult.error) throw new Error(interviewsResult.error.message);
  if (aiHandoverResult.error) throw new Error(aiHandoverResult.error.message);

  const messageAttachments = new Map<string, Array<Record<string, unknown>>>();
  for (const attachment of attachmentsResult.data ?? []) {
    const key = String(attachment.message_id);
    messageAttachments.set(key, [...(messageAttachments.get(key) ?? []), attachment]);
  }

  const visibleMessages = (messagesResult.data ?? [])
    .filter((message) => {
      if (actor.scope === "staff") return true;
      if (actor.scope === "employer") return Boolean(message.visible_to_employer);
      return Boolean(message.visible_to_candidate);
    })
    .map((message) => ({
      ...message,
      attachments: messageAttachments.get(String(message.id)) ?? [],
    }));

  const candidateProfiles = await loadCandidatePublicProfiles([String(conversation.candidate_id)]);
  const employers = await loadEmployers([String(conversation.employer_id)]);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.conversation.accessed",
    targetType: "recruitment_conversation",
    targetId: conversationId,
  });

  return {
    conversation: mapConversationSummary(conversation, locale, candidateProfiles, employers),
    participants: participantsResult.data ?? [],
    messages: visibleMessages,
    internalNotes: notesResult.data ?? [],
    interviews: interviewsResult.data ?? [],
    aiHandoverSummary: aiHandoverResult.data ?? null,
    permissions: {
      canSendMessages: conversation.status === "active" || actor.scope === "staff",
      canRespondToInvitation: actor.scope === "candidate" && conversation.status === "pending_candidate_acceptance",
      canModerate: actor.scope === "staff",
      canAddInternalNotes: actor.scope === "staff",
      canScheduleInterview: actor.scope === "staff" && conversation.status === "active",
      canRequestInterview:
        actor.scope === "employer" &&
        ["active", "paused"].includes(String(conversation.status ?? "")) &&
        Boolean(conversation.related_application_id),
    },
  };
}

export async function respondToConversationInvitation(auth: AuthContext, conversationId: string, input: { action: "accept" | "decline"; locale: string }) {
  const { actor, conversation } = await loadConversationForActor(auth, conversationId);
  if (actor.scope !== "candidate") {
    throw new Error("Only the candidate may respond to this invitation");
  }

  if (conversation.status !== "pending_candidate_acceptance") {
    throw new Error("This conversation is no longer waiting for candidate response");
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (input.action === "decline") {
    await supabase
      .from("recruitment_conversation_participants")
      .update({ participation_status: "declined", updated_at: now })
      .eq("conversation_id", conversationId)
      .eq("participant_role", "candidate");

    await supabase
      .from("recruitment_conversations")
      .update({ status: "closed", recruitment_stage: "closed", closed_at: now, closure_reason: "candidate_declined" })
      .eq("id", conversationId);

    await supabase.from("recruitment_messages").insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: "system",
      message_type: "system",
      body: input.locale === "ar" ? "رفض المرشح الدعوة إلى المحادثة الخاضعة للإشراف." : "The candidate declined the supervised conversation invitation.",
    });
  } else {
    const { data: participantsData, error: participantsError } = await supabase
      .from("recruitment_conversation_participants")
      .update({ participation_status: "active", updated_at: now })
      .eq("conversation_id", conversationId)
      .eq("participant_role", "candidate")
      .select("participant_role, participation_status");

    if (participantsError) throw new Error(participantsError.message);

    const { data: remainingParticipants, error: remainingParticipantsError } = await supabase
      .from("recruitment_conversation_participants")
      .select("participant_role, participation_status")
      .eq("conversation_id", conversationId);

    if (remainingParticipantsError) throw new Error(remainingParticipantsError.message);

    const participants = [...(participantsData ?? []), ...(remainingParticipants ?? [])];
    if (!canActivateSupervisedConversation({
      employerAuthUserId: conversation.employer_auth_user_id,
      candidateAuthUserId: conversation.candidate_auth_user_id,
      assignedStaffId: conversation.assigned_staff_id,
      participants,
    })) {
      throw new Error("The supervised conversation is missing a required participant");
    }

    await supabase
      .from("recruitment_conversations")
      .update({ status: "active", recruitment_stage: "active_dialogue", activated_at: now, updated_at: now })
      .eq("id", conversationId);

    await supabase.from("recruitment_messages").insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: "system",
      message_type: "system",
      body: input.locale === "ar" ? "قبل المرشح الدعوة. أصبحت المحادثة الخاضعة للإشراف نشطة الآن." : "The candidate accepted the invitation. The supervised conversation is now active.",
    });
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: `recruitment.conversation.${input.action}`,
    targetType: "recruitment_conversation",
    targetId: conversationId,
  });

  return { id: conversationId, action: input.action };
}

export async function postConversationMessage(auth: AuthContext, conversationId: string, input: {
  body: string;
  locale: string;
  attachments: Array<{
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    storageBucket: string;
    storageObjectPath: string;
  }>;
}) {
  const { actor, conversation } = await loadConversationForActor(auth, conversationId);
  const supabase = createSupabaseAdminClient();

  if (conversation.status === "pending_candidate_acceptance" && actor.scope !== "staff") {
    throw new Error("The conversation is not active yet");
  }

  if (conversation.status === "paused" && actor.scope !== "staff") {
    throw new Error("Messaging is paused by Prime Global");
  }

  if (conversation.status === "closed" || conversation.status === "archived") {
    throw new Error("This conversation is closed");
  }

  let activeConversation = conversation as Record<string, unknown>;
  const senderRole = getConversationParticipantRole(auth.role);
  const isEmployerOrCandidate = senderRole === "employer" || senderRole === "candidate";

  if (isEmployerOrCandidate && shouldSwitchToAiSupervised(activeConversation)) {
    await supabase
      .from("recruitment_conversations")
      .update({
        conversation_mode: "ai_supervised",
        ai_activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    const { data: refreshedConversation } = await supabase
      .from("recruitment_conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (refreshedConversation) {
      activeConversation = refreshedConversation;
    }

    await supabase.from("recruitment_messages").insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: "prime_global_ai",
      actor_type: "prime_global_ai",
      ai_task_type: "process_qna",
      message_type: "system",
      body: getAiSupervisorBanner(input.locale),
      moderation_state: "approved",
      visible_to_employer: true,
      visible_to_candidate: true,
      visible_to_staff: true,
    });
  }

  const moderation = moderateRecruitmentMessageContent(input.body);
  const stage9Protection = await protectRecruitmentMessage({
    messageId: `recruitment-message-${randomUUID()}`,
    messageText: input.body,
    conversationId,
    actorRole: senderRole,
  });
  const now = new Date().toISOString();

  const hasProtectedProjection = stage9Protection.hadProtection;

  const { data: message, error: messageError } = await supabase
    .from("recruitment_messages")
    .insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: senderRole,
      actor_type: "human",
      message_type: hasProtectedProjection ? "moderation" : moderation.state === "requires_review" ? "moderation" : "text",
      body: input.body,
      moderation_state: hasProtectedProjection ? "requires_review" : moderation.state,
      contains_contact_attempt: moderation.containsContactAttempt || hasProtectedProjection,
      visible_to_employer: !hasProtectedProjection && moderation.state === "approved",
      visible_to_candidate: !hasProtectedProjection && moderation.state === "approved",
      visible_to_staff: true,
      created_at: now,
    })
    .select("*")
    .single();

  if (messageError) throw new Error(messageError.message);

  if (input.attachments.length > 0) {
    const attachmentPayload = input.attachments.map((attachment) => ({
      message_id: message.id,
      uploaded_by_auth_user_id: auth.userId,
      file_name: attachment.fileName,
      mime_type: attachment.mimeType,
      file_size_bytes: attachment.fileSizeBytes,
      storage_bucket: attachment.storageBucket,
      storage_object_path: attachment.storageObjectPath,
      moderation_state:
        moderation.state === "requires_review" || /qr|qrcode/i.test(attachment.fileName)
          ? "requires_review"
          : "approved",
    }));

    const { error: attachmentError } = await supabase.from("recruitment_message_attachments").insert(attachmentPayload);
    if (attachmentError) throw new Error(attachmentError.message);
  }

  if (hasProtectedProjection || moderation.state === "requires_review") {
    const projectedBody = hasProtectedProjection ? stage9Protection.protectedText : getModerationHoldMessage(input.locale);

    const { data: projectedMessage, error: projectedMessageError } = await supabase
      .from("recruitment_messages")
      .insert({
        conversation_id: conversationId,
        sender_auth_user_id: auth.userId,
        sender_role: senderRole,
        actor_type: "human",
        message_type: "text",
        body: projectedBody,
        moderation_state: "approved",
        contains_contact_attempt: hasProtectedProjection,
        visible_to_employer: true,
        visible_to_candidate: true,
        visible_to_staff: true,
        created_at: now,
      })
      .select("*")
      .single();

    if (projectedMessageError) throw new Error(projectedMessageError.message);

    await supabase.from("recruitment_moderation_events").insert({
      conversation_id: conversationId,
      message_id: message.id,
      actor_auth_user_id: auth.userId,
      event_type: "contact_data_detected",
      moderation_state: moderation.state,
      details: {
        reasons: moderation.reasons,
        stage9Findings: stage9Protection.findings,
      },
    });

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "recruitment.message.contact_attempt_detected",
      targetType: "recruitment_message",
      targetId: message.id,
      metadata: { conversationId, reasons: moderation.reasons },
    });

    await insertNotifications(supabase, [
      {
        authUserId: String(activeConversation.assigned_staff_id ?? conversation.assigned_staff_id),
        category: "message",
        title: input.locale === "ar" ? "رسالة تحتاج إلى مراجعة" : "Message requires review",
        body: input.locale === "ar"
          ? "تم إسقاط إسقاط آمن للرسالة بعد حماية بيانات التواصل. النسخة الأصلية متاحة للمراجعة الداخلية فقط."
          : "A protected projection was delivered after masking contact data. The original is visible only to internal staff review.",
        entityType: "recruitment_message",
        entityId: message.id,
      },
    ]);

    return { message: projectedMessage, moderatedMessageId: message.id, moderationState: "requires_review" };
  }

  const recipientIds = [conversation.employer_auth_user_id, conversation.candidate_auth_user_id, conversation.assigned_staff_id]
    .filter((userId) => userId && userId !== auth.userId) as string[];

  await insertNotifications(
    supabase,
    recipientIds.map((userId) => ({
      authUserId: userId,
      category: "message",
      title: input.locale === "ar" ? "رسالة جديدة داخل محادثة خاضعة للإشراف" : "New message in a supervised conversation",
      body: (hasProtectedProjection ? stage9Protection.protectedText : input.body).slice(0, 180),
      entityType: "recruitment_conversation",
      entityId: conversationId,
    }))
  );

  if (
    isEmployerOrCandidate &&
    String(activeConversation.conversation_mode ?? "staff_active") === "ai_supervised" &&
    moderation.state === "approved"
  ) {
    const aiReplyBody =
      input.locale === "ar"
        ? "تم استلام رسالتك بواسطة مساعد برايم جلوبال الذكي. سيتم تسليم التفاصيل لممثل برايم جلوبال، ويمكننا الآن جمع مواعيد المقابلة أو الإجابة عن أسئلة العملية."
        : "Your message was received by the Prime Global AI Assistant. The details will be handed over to Prime Global staff, and I can help collect interview availability or answer process questions.";

    await supabase.from("recruitment_messages").insert({
      conversation_id: conversationId,
      sender_auth_user_id: String(activeConversation.assigned_staff_id ?? conversation.assigned_staff_id),
      sender_role: "prime_global_ai",
      actor_type: "prime_global_ai",
      ai_task_type: "process_qna",
      message_type: "system",
      body: aiReplyBody,
      moderation_state: "approved",
      visible_to_employer: true,
      visible_to_candidate: true,
      visible_to_staff: true,
    });
  }

  return { message, moderatedMessageId: null, moderationState: moderation.state };
}

export async function updateConversationForStaff(auth: AuthContext, conversationId: string, input: {
  status?: "active" | "paused" | "closed" | "archived";
  conversationMode?: "staff_active" | "ai_supervised" | "awaiting_staff" | "closed";
  recruitmentStage?: "conversation_requested" | "candidate_review" | "active_dialogue" | "interview_planning" | "interview_live" | "offer_review" | "closed";
  pausedReason?: string | null;
  closureReason?: string | null;
  assignedStaffUserId?: string;
  escalatedToAdmin?: boolean;
}) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may update supervised conversations");
  }

  const { conversation } = await loadConversationForActor(auth, conversationId);
  const supabase = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};

  if (input.status) patch.status = input.status;
  if (input.conversationMode) patch.conversation_mode = input.conversationMode;
  if (input.recruitmentStage) patch.recruitment_stage = input.recruitmentStage;
  if (input.pausedReason !== undefined) patch.paused_reason = input.pausedReason;
  if (input.closureReason !== undefined) patch.closure_reason = input.closureReason;
  if (input.escalatedToAdmin !== undefined) patch.escalated_to_admin = input.escalatedToAdmin;
  if (input.status === "closed") patch.closed_at = new Date().toISOString();

  if (input.assignedStaffUserId && input.assignedStaffUserId !== conversation.assigned_staff_id) {
    await verifyPrimeStaffUser(input.assignedStaffUserId);
    patch.assigned_staff_id = input.assignedStaffUserId;

    await supabase
      .from("recruitment_conversation_participants")
      .update({ auth_user_id: input.assignedStaffUserId, updated_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("participant_role", "prime_global_staff");

    if (conversation.request_id) {
      await supabase
        .from("recruitment_conversation_requests")
        .update({ assigned_staff_user_id: input.assignedStaffUserId, updated_at: new Date().toISOString() })
        .eq("id", conversation.request_id);
    }
  }

  if (
    (input.conversationMode === "staff_active" || input.status === "active") &&
    String(conversation.conversation_mode ?? "staff_active") === "ai_supervised"
  ) {
    const { data: heldMessages } = await supabase
      .from("recruitment_messages")
      .select("id, body, created_at, sender_role")
      .eq("conversation_id", conversationId)
      .eq("moderation_state", "requires_review")
      .order("created_at", { ascending: false })
      .limit(25);

    const { data: blockedAttempts } = await supabase
      .from("recruitment_moderation_events")
      .select("details, created_at")
      .eq("conversation_id", conversationId)
      .eq("event_type", "contact_data_detected")
      .order("created_at", { ascending: false })
      .limit(25);

    const { data: interviewSuggestions } = await supabase
      .from("recruitment_messages")
      .select("body, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender_role", "prime_global_ai")
      .eq("ai_task_type", "interview_suggestion")
      .order("created_at", { ascending: false })
      .limit(10);

    await supabase.from("recruitment_ai_handover_summaries").insert({
      conversation_id: conversationId,
      generated_by_auth_user_id: auth.userId,
      unanswered_questions: (heldMessages ?? []).map((message) => ({
        messageId: message.id,
        body: message.body,
        createdAt: message.created_at,
      })),
      blocked_contact_attempts: blockedAttempts ?? [],
      proposed_interview_times: interviewSuggestions ?? [],
      follow_up_tasks: [
        {
          task: "Review AI-assisted conversation and pending moderated messages",
          priority: "high",
        },
      ],
      summary_text:
        "AI-supervised period complete. Review blocked contact attempts, unanswered moderated messages, and suggested interview slots.",
    });

    patch.conversation_mode = "staff_active";
    patch.ai_deactivated_at = new Date().toISOString();
    patch.staff_last_active_at = new Date().toISOString();

    await supabase.from("recruitment_messages").insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: "system",
      actor_type: "system",
      ai_task_type: "handover_summary",
      message_type: "system",
      body:
        "Prime Global staff has resumed direct supervision. AI handover summary was generated for internal follow-up.",
      moderation_state: "approved",
      visible_to_employer: true,
      visible_to_candidate: true,
      visible_to_staff: true,
    });
  }

  const { data, error } = await supabase
    .from("recruitment_conversations")
    .update(patch)
    .eq("id", conversationId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.conversation.updated",
    targetType: "recruitment_conversation",
    targetId: conversationId,
    metadata: patch,
  });

  return data;
}

export async function addInternalNote(auth: AuthContext, conversationId: string, note: string) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may add internal notes");
  }

  await loadConversationForActor(auth, conversationId);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("recruitment_internal_notes")
    .insert({
      conversation_id: conversationId,
      created_by_staff_user_id: auth.userId,
      note,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.internal_note.created",
    targetType: "recruitment_conversation",
    targetId: conversationId,
  });

  return data;
}

export async function listInternalNotes(auth: AuthContext, conversationId: string) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may view internal notes");
  }

  await loadConversationForActor(auth, conversationId);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("recruitment_internal_notes")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createConversationInterview(auth: AuthContext, conversationId: string, input: {
  scheduledAt: string;
  durationMinutes: number;
  waitingRoomEnabled: boolean;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenSharingEnabled: boolean;
  interviewNotes?: string | null;
  locale: string;
}) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may schedule interviews");
  }

  const { conversation } = await loadConversationForActor(auth, conversationId);
  if (conversation.status !== "active" && conversation.status !== "paused") {
    throw new Error("Interviews may only be created from approved supervised conversations");
  }

  const supabase = createSupabaseAdminClient();
  const { data: interview, error } = await supabase
    .from("recruitment_interviews")
    .insert({
      conversation_id: conversationId,
      related_application_id: conversation.related_application_id,
      created_by_staff_user_id: auth.userId,
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes,
      waiting_room_enabled: input.waitingRoomEnabled,
      camera_enabled: input.cameraEnabled,
      microphone_enabled: input.microphoneEnabled,
      screen_sharing_enabled: input.screenSharingEnabled,
      interview_notes: input.interviewNotes ?? null,
      meeting_provider: "prime_global_meeting_center",
      external_meeting_links_blocked: true,
      meeting_room_reference: `pg-room-${conversationId}`,
      meeting_metadata: {
        ui: {
          camera: input.cameraEnabled,
          microphone: input.microphoneEnabled,
          screenSharing: input.screenSharingEnabled,
          chat: true,
          participants: true,
          timer: true,
        },
      },
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const participants = [
    { interview_id: interview.id, auth_user_id: conversation.employer_auth_user_id, participant_role: "employer" },
    { interview_id: interview.id, auth_user_id: conversation.candidate_auth_user_id, participant_role: "candidate" },
    { interview_id: interview.id, auth_user_id: conversation.assigned_staff_id, participant_role: "prime_global_staff" },
  ];
  const { error: participantsError } = await supabase.from("recruitment_interview_participants").insert(participants);
  if (participantsError) throw new Error(participantsError.message);

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interview.id,
    conversation_id: conversationId,
    actor_auth_user_id: auth.userId,
    actor_role: "prime_global_staff",
    event_type: "interview_scheduled",
    details: {
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
    },
  });

  await supabase.from("recruitment_messages").insert({
    conversation_id: conversationId,
    sender_auth_user_id: auth.userId,
    sender_role: "system",
    message_type: "interview",
    body:
      input.locale === "ar"
        ? `تمت جدولة مقابلة ثلاثية بتاريخ ${input.scheduledAt}.`
        : `A supervised three-party interview was scheduled for ${input.scheduledAt}.`,
  });

  await insertNotifications(supabase, [
    conversation.employer_auth_user_id,
    conversation.candidate_auth_user_id,
    conversation.assigned_staff_id,
  ].map((userId) => ({
    authUserId: String(userId),
    category: "interview",
    title: input.locale === "ar" ? "تمت جدولة مقابلة خاضعة للإشراف" : "Supervised interview scheduled",
    body: input.locale === "ar" ? `موعد المقابلة: ${input.scheduledAt}` : `Interview scheduled for ${input.scheduledAt}`,
    entityType: "recruitment_interview",
    entityId: interview.id,
  })));

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.interview.created",
    targetType: "recruitment_interview",
    targetId: interview.id,
    metadata: { conversationId },
  });

  return interview;
}

export async function requestInterviewByEmployer(auth: AuthContext, conversationId: string, input: { note?: string; locale: string }) {
  const { actor, conversation } = await loadConversationForActor(auth, conversationId);
  if (actor.scope !== "employer") {
    throw new Error("Only employers may submit interview requests from this endpoint");
  }

  const eligibility = canEmployerRequestInterview({
    role: "employer",
    conversationStatus: String(conversation.status ?? ""),
    hasRelatedApplication: Boolean(conversation.related_application_id),
  });

  if (!eligibility.allowed) {
    throw new Error(eligibility.reason);
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  await supabase.from("recruitment_messages").insert({
    conversation_id: conversationId,
    sender_auth_user_id: auth.userId,
    sender_role: "system",
    message_type: "interview",
    body:
      input.note?.trim() ||
      (input.locale === "ar"
        ? "قدم صاحب العمل طلب مقابلة داخل مركز المقابلات في برايم جلوبال. بانتظار مراجعة موظف برايم جلوبال."
        : "Employer submitted an interview request inside Prime Global Interview Center. Waiting for Prime Global staff review."),
    moderation_state: "approved",
    visible_to_employer: true,
    visible_to_candidate: true,
    visible_to_staff: true,
    created_at: now,
  });

  await supabase
    .from("recruitment_conversations")
    .update({ recruitment_stage: "interview_planning", updated_at: now })
    .eq("id", conversationId);

  await insertNotifications(
    supabase,
    [conversation.candidate_auth_user_id, conversation.assigned_staff_id]
      .filter(Boolean)
      .map((userId) => ({
        authUserId: String(userId),
        category: "interview",
        title: input.locale === "ar" ? "طلب مقابلة جديد" : "New interview request",
        body:
          input.locale === "ar"
            ? "تم إرسال طلب مقابلة داخل المنصة. ستتم المتابعة من خلال مركز المقابلات في برايم جلوبال."
            : "An in-platform interview request was sent. Follow-up will happen through Prime Global Interview Center.",
        entityType: "recruitment_conversation",
        entityId: conversationId,
      }))
  );

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.interview.requested_by_employer",
    targetType: "recruitment_conversation",
    targetId: conversationId,
    metadata: {
      hasRelatedApplication: Boolean(conversation.related_application_id),
      noteProvided: Boolean(input.note?.trim()),
    },
  });

  return {
    conversationId,
    status: "requested",
    message: input.locale === "ar" ? "تم إرسال طلب المقابلة داخل المنصة." : "Interview request submitted in-platform.",
  };
}

function getLatestCoordinationTermsVersion(interview: Record<string, unknown>) {
  const metadata = (interview.meeting_metadata as Record<string, unknown> | null) ?? {};
  const terms = (metadata.coordination_terms as Record<string, unknown> | null) ?? {};
  return String(terms.latestVersion ?? "PG-INTERVIEW-TERMS-2026-07");
}

function getCoordinationNotice(locale: string) {
  return locale === "ar"
    ? "تُنسَّق هذه المقابلة حصريًا من خلال برايم جلوبال."
    : "This interview is coordinated exclusively by Prime Global.";
}

function hashJoinToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toProtectedParticipantRole(role: "candidate" | "employer" | "prime_global_staff"): ProtectedInterviewParticipantRole {
  if (role === "candidate") return "Candidate";
  if (role === "employer") return "Employer";
  return "Prime Recruiter";
}

function toProtectedInterviewRecord(input: {
  interview: Record<string, unknown>;
  conversation: Record<string, unknown>;
}): ProtectedInterviewRecord {
  const status = String(input.interview.status ?? "scheduled");
  const state =
    status === "live"
      ? "interview_activated"
      : status === "completed"
        ? "closed"
        : status === "cancelled"
          ? "cancelled"
          : "interview_scheduled";

  return {
    interviewId: String(input.interview.id),
    organizationId: "prime-global",
    tenantId: null,
    candidateId: String(input.conversation.candidate_id ?? ""),
    employerId: String(input.conversation.employer_id ?? ""),
    createdBy: String(input.interview.created_by_staff_user_id ?? ""),
    state,
    roomId: String(input.interview.meeting_room_reference ?? `pg-room-${String(input.interview.id)}`),
    roomSessionVersion: 1,
    invitationAccepted: true,
    termsAcceptedVersion: "PG-INTERVIEW-TERMS-2026-07",
    latestTermsVersion: "PG-INTERVIEW-TERMS-2026-07",
    policyApproved: true,
    ruleApproved: true,
    hasActiveFreeze: String(input.conversation.status ?? "") === "paused",
    hasCriticalViolation: Boolean((input.interview.meeting_metadata as Record<string, unknown> | null)?.protection),
    scheduledAt: String(input.interview.scheduled_at ?? ""),
    startedAt: input.interview.host_started_at ? String(input.interview.host_started_at) : null,
    completedAt: input.interview.host_ended_at ? String(input.interview.host_ended_at) : null,
    closedAt: input.interview.host_ended_at ? String(input.interview.host_ended_at) : null,
    cancelledAt: status === "cancelled" ? new Date().toISOString() : null,
    expiredAt: null,
    rescheduleCount: 0,
    version: 1,
    createdAt: String(input.interview.created_at ?? new Date().toISOString()),
    updatedAt: String(input.interview.updated_at ?? new Date().toISOString()),
    participants: [],
    metadata: (input.interview.meeting_metadata as Record<string, unknown> | null) ?? {},
  };
}

async function hasAcceptedInterviewInvitation(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  interviewId: string,
  actorRole: "candidate" | "employer"
) {
  const { data, error } = await supabase
    .from("recruitment_interview_events")
    .select("id")
    .eq("interview_id", interviewId)
    .eq("event_type", "invitation_accepted")
    .eq("actor_role", actorRole)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function hasAcceptedLatestTerms(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  interviewId: string,
  actorRole: "candidate" | "employer",
  latestTermsVersion: string
) {
  const { data, error } = await supabase
    .from("recruitment_interview_events")
    .select("details")
    .eq("interview_id", interviewId)
    .eq("event_type", "coordination_terms_accepted")
    .eq("actor_role", actorRole)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return false;

  return String((data.details as Record<string, unknown> | null)?.termsVersion ?? "") === latestTermsVersion;
}

async function ensureInterviewParticipant(auth: AuthContext, interviewId: string) {
  const supabase = createSupabaseAdminClient();
  const role = getConversationParticipantRole(auth.role);
  const { data, error } = await supabase
    .from("recruitment_interview_participants")
    .select("id, auth_user_id, participant_role")
    .eq("interview_id", interviewId)
    .eq("participant_role", role)
    .eq("auth_user_id", auth.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
  return data;
}

async function ensureCandidateInterviewEligibility(auth: AuthContext) {
  if (auth.role !== "candidate") return;

  const completion = await evaluateCandidateProfileCompletion(auth.userId);
  if (completion.completed) return;

  throw new Error(
    `Complete your professional profile before interview actions. Missing: ${completion.missing.join(", ")}`
  );
}

export async function getInterviewMeetingCenter(auth: AuthContext, interviewId: string, locale: string) {
  await ensureCandidateInterviewEligibility(auth);

  const supabase = createSupabaseAdminClient();
  const { data: interview, error: interviewError } = await supabase
    .from("recruitment_interviews")
    .select("*")
    .eq("id", interviewId)
    .maybeSingle();

  if (interviewError) throw new Error(interviewError.message);
  if (!interview) throw new Error("Interview not found");

  const { actor, conversation } = await loadConversationForActor(auth, String(interview.conversation_id));
  const role = actor.scope === "staff" ? "staff" : actor.scope;
  const permissions = getInterviewCenterPermissions({ role, interviewStatus: String(interview.status ?? "scheduled") });
  const latestTermsVersion = getLatestCoordinationTermsVersion(interview);

  const [candidateInvitationAccepted, employerInvitationAccepted, candidateTermsAccepted, employerTermsAccepted] = await Promise.all([
    hasAcceptedInterviewInvitation(supabase, interviewId, "candidate"),
    hasAcceptedInterviewInvitation(supabase, interviewId, "employer"),
    hasAcceptedLatestTerms(supabase, interviewId, "candidate", latestTermsVersion),
    hasAcceptedLatestTerms(supabase, interviewId, "employer", latestTermsVersion),
  ]);

  const interviewMetadata = (interview.meeting_metadata as Record<string, unknown> | null) ?? {};
  const readinessByUser = (interviewMetadata.readiness as Record<string, unknown> | null) ?? {};

  const [participantsResult, chatResult, historyResult] = await Promise.all([
    supabase.from("recruitment_interview_participants").select("*").eq("interview_id", interviewId).order("created_at", { ascending: true }),
    supabase.from("recruitment_interview_chat_messages").select("*").eq("interview_id", interviewId).order("created_at", { ascending: true }),
    supabase.from("recruitment_interview_events").select("*").eq("interview_id", interviewId).order("created_at", { ascending: true }),
  ]);

  if (participantsResult.error) throw new Error(participantsResult.error.message);
  if (chatResult.error) throw new Error(chatResult.error.message);
  if (historyResult.error) throw new Error(historyResult.error.message);

  const visibleChat = (chatResult.data ?? []).filter((item) => {
    if (role === "staff") return true;
    return item.moderation_state === "approved";
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.interview.meeting_center.accessed",
    targetType: "recruitment_interview",
    targetId: interviewId,
    metadata: { conversationId: conversation.id },
  });

  return {
    interview,
    conversationId: conversation.id,
    assignedStaffUserId: conversation.assigned_staff_id,
    latestCoordinationTermsVersion: latestTermsVersion,
    invitationState: {
      candidateAccepted: candidateInvitationAccepted,
      employerAccepted: employerInvitationAccepted,
    },
    coordinationTerms: {
      candidateAcceptedLatest: candidateTermsAccepted,
      employerAcceptedLatest: employerTermsAccepted,
      latestVersion: latestTermsVersion,
      notice: getCoordinationNotice(locale),
    },
    readiness: readinessByUser,
    meetingCenter: {
      provider: "prime_global_meeting_center",
      externalMeetingLinksAllowed: false,
      features: {
        camera: true,
        microphone: true,
        screenSharing: true,
        chat: true,
        participants: true,
        meetingTimer: true,
      },
      supervisionNotice:
        locale === "ar"
          ? "تتم المقابلة داخل مركز برايم جلوبال فقط. يمنع تبادل بيانات التواصل المباشر أو الروابط الخارجية."
          : "The interview runs only inside Prime Global Meeting Center. Direct contacts and external links are blocked.",
      coordinationNotice: getCoordinationNotice(locale),
    },
    permissions,
    participants: participantsResult.data ?? [],
    chatMessages: visibleChat,
    history: historyResult.data ?? [],
  };
}

export async function respondInterviewInvitation(auth: AuthContext, interviewId: string, input: { action: "accept" | "reject"; locale: string }) {
  await ensureCandidateInterviewEligibility(auth);

  const detail = await getInterviewMeetingCenter(auth, interviewId, input.locale);
  const role = getConversationParticipantRole(auth.role);
  if (role !== "candidate" && role !== "employer") {
    throw new Error("Only employer or candidate may respond to invitation");
  }

  await ensureInterviewParticipant(auth, interviewId);
  const supabase = createSupabaseAdminClient();

  if (input.action === "reject" && role === "candidate") {
    await supabase
      .from("recruitment_interview_participants")
      .update({ presence_status: "declined" })
      .eq("interview_id", interviewId)
      .eq("participant_role", "candidate")
      .eq("auth_user_id", auth.userId);

    await supabase.from("recruitment_interview_events").insert({
      interview_id: interviewId,
      conversation_id: detail.conversationId,
      actor_auth_user_id: auth.userId,
      actor_role: role,
      event_type: "invitation_declined",
      details: {},
    });

    await supabase
      .from("recruitment_interviews")
      .update({ status: "cancelled" })
      .eq("id", interviewId);

    return { interviewId, status: "cancelled" };
  }

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interviewId,
    conversation_id: detail.conversationId,
    actor_auth_user_id: auth.userId,
    actor_role: role,
    event_type: "invitation_accepted",
    details: {},
  });

  await supabase
    .from("recruitment_interviews")
    .update({ status: "waiting" })
    .eq("id", interviewId)
    .in("status", ["scheduled", "waiting"]);

  return { interviewId, status: "waiting" };
}

export async function acceptInterviewCoordinationTerms(auth: AuthContext, interviewId: string, input: { locale: string }) {
  await ensureCandidateInterviewEligibility(auth);

  const detail = await getInterviewMeetingCenter(auth, interviewId, input.locale);
  const role = getConversationParticipantRole(auth.role);
  if (role !== "candidate" && role !== "employer") {
    throw new Error("Only employer or candidate may accept coordination terms");
  }

  await ensureInterviewParticipant(auth, interviewId);
  const supabase = createSupabaseAdminClient();

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interviewId,
    conversation_id: detail.conversationId,
    actor_auth_user_id: auth.userId,
    actor_role: role,
    event_type: "coordination_terms_accepted",
    details: { termsVersion: detail.latestCoordinationTermsVersion },
  });

  return {
    interviewId,
    accepted: true,
    termsVersion: detail.latestCoordinationTermsVersion,
    notice: getCoordinationNotice(input.locale),
  };
}

export async function setInterviewParticipantReadiness(auth: AuthContext, interviewId: string, input: { ready: boolean }) {
  await ensureCandidateInterviewEligibility(auth);

  const supabase = createSupabaseAdminClient();
  const role = getConversationParticipantRole(auth.role);
  const detail = await getInterviewMeetingCenter(auth, interviewId, "en");
  await ensureInterviewParticipant(auth, interviewId);

  const metadata = (detail.interview.meeting_metadata as Record<string, unknown> | null) ?? {};
  const readiness = (metadata.readiness as Record<string, unknown> | null) ?? {};
  readiness[auth.userId] = {
    ready: input.ready,
    role,
    updatedAt: new Date().toISOString(),
  };

  await supabase
    .from("recruitment_interviews")
    .update({
      meeting_metadata: {
        ...metadata,
        readiness,
      },
    })
    .eq("id", interviewId);

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interviewId,
    conversation_id: detail.conversationId,
    actor_auth_user_id: auth.userId,
    actor_role: role,
    event_type: input.ready ? "participant_ready" : "participant_not_ready",
    details: {},
  });

  return { interviewId, ready: input.ready };
}

export async function issueInterviewJoinToken(auth: AuthContext, interviewId: string) {
  await ensureCandidateInterviewEligibility(auth);

  const supabase = createSupabaseAdminClient();
  const detail = await getInterviewMeetingCenter(auth, interviewId, "en");
  const role = getConversationParticipantRole(auth.role);
  await ensureInterviewParticipant(auth, interviewId);

  if (String(detail.interview.status ?? "scheduled") !== "live") {
    throw new Error("Joining is only available after staff activation");
  }

  const metadata = (detail.interview.meeting_metadata as Record<string, unknown> | null) ?? {};
  const security = (metadata.security as Record<string, unknown> | null) ?? {};
  const tokens = Array.isArray(security.joinTokens) ? (security.joinTokens as Array<Record<string, unknown>>) : [];

  const rawToken = `pgjt_${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 3 * 60_000).toISOString();
  const tokenHash = hashJoinToken(rawToken);

  const nextTokens = [
    ...tokens.filter((token) => String(token.expiresAt ?? "") > new Date().toISOString() && !token.usedAt),
    {
      tokenHash,
      authUserId: auth.userId,
      role,
      issuedAt: new Date().toISOString(),
      expiresAt,
      usedAt: null,
    },
  ];

  await supabase
    .from("recruitment_interviews")
    .update({
      meeting_metadata: {
        ...metadata,
        security: {
          ...security,
          joinTokens: nextTokens,
        },
      },
    })
    .eq("id", interviewId);

  return {
    interviewId,
    token: rawToken,
    expiresAt,
  };
}

export async function joinInterviewMeeting(auth: AuthContext, interviewId: string, joinToken: string) {
  await ensureCandidateInterviewEligibility(auth);

  const supabase = createSupabaseAdminClient();
  const detail = await getInterviewMeetingCenter(auth, interviewId, "en");
  if (!detail.permissions.canJoinMeeting) {
    throw new Error("You cannot join this meeting in the current state");
  }

  if (!joinToken.trim()) {
    throw new Error("A valid join token is required");
  }

  if (String(detail.interview.status ?? "scheduled") !== "live") {
    throw new Error("Joining before staff activation is not allowed");
  }

  const role = getConversationParticipantRole(auth.role);
  const protectedRole = toProtectedParticipantRole(role);
  if (!protectedAuthorizeParticipantRole(protectedRole)) {
    throw new Error("Unauthorized participant role");
  }

  const protectedRecord = toProtectedInterviewRecord({
    interview: detail.interview,
    conversation: { id: detail.conversationId, status: detail.interview.status },
  });
  const joinPolicy = enforceProtectedInterviewPolicy({
    interview: protectedRecord,
    participantRole: protectedRole,
    action: "join",
    metadata: detail.interview.meeting_metadata as Record<string, unknown> | undefined,
  });
  if (!joinPolicy.allowed) {
    throw new Error(joinPolicy.reasons.join(" "));
  }

  await ensureInterviewParticipant(auth, interviewId);

  const metadata = (detail.interview.meeting_metadata as Record<string, unknown> | null) ?? {};
  const security = (metadata.security as Record<string, unknown> | null) ?? {};
  const tokens = Array.isArray(security.joinTokens) ? (security.joinTokens as Array<Record<string, unknown>>) : [];
  const tokenHash = hashJoinToken(joinToken);

  const matched = tokens.find((token) =>
    token.tokenHash === tokenHash &&
    token.authUserId === auth.userId &&
    token.role === role &&
    !token.usedAt &&
    String(token.expiresAt ?? "") > new Date().toISOString()
  );

  if (!matched) {
    throw new Error("Join token is invalid, expired, or already used");
  }

  const nextTokens = tokens.map((token) =>
    token.tokenHash === tokenHash ? { ...token, usedAt: new Date().toISOString() } : token
  );

  await supabase
    .from("recruitment_interviews")
    .update({
      meeting_metadata: {
        ...metadata,
        security: {
          ...security,
          joinTokens: nextTokens,
        },
      },
    })
    .eq("id", interviewId);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("recruitment_interview_participants")
    .update({ presence_status: "joined", joined_at: now })
    .eq("interview_id", interviewId)
    .eq("participant_role", role)
    .eq("auth_user_id", auth.userId);

  if (error) throw new Error(error.message);

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interviewId,
    conversation_id: detail.conversationId,
    actor_auth_user_id: auth.userId,
    actor_role: role,
    event_type: "participant_joined",
    details: {},
  });

  return { interviewId, joined: true };
}

export async function leaveInterviewMeeting(auth: AuthContext, interviewId: string) {
  const supabase = createSupabaseAdminClient();
  const detail = await getInterviewMeetingCenter(auth, interviewId, "en");
  const role = getConversationParticipantRole(auth.role);
  await ensureInterviewParticipant(auth, interviewId);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("recruitment_interview_participants")
    .update({ presence_status: "left", left_at: now })
    .eq("interview_id", interviewId)
    .eq("participant_role", role)
    .eq("auth_user_id", auth.userId);

  if (error) throw new Error(error.message);

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interviewId,
    conversation_id: detail.conversationId,
    actor_auth_user_id: auth.userId,
    actor_role: role,
    event_type: "participant_left",
    details: {},
  });

  return { interviewId, left: true };
}

export async function postInterviewMeetingChatMessage(auth: AuthContext, interviewId: string, input: { body: string; locale: string }) {
  const detail = await getInterviewMeetingCenter(auth, interviewId, input.locale);
  if (!detail.permissions.canSendChat) {
    throw new Error("Chat is disabled for this interview state");
  }

  const supabase = createSupabaseAdminClient();
  const role = getConversationParticipantRole(auth.role);
  await ensureInterviewParticipant(auth, interviewId);
  const moderation = enforceInPlatformMeetingOnly({ body: input.body });
  const stage9Protection = await protectRecruitmentMessage({
    messageId: `meeting-chat-${randomUUID()}`,
    messageText: input.body,
    conversationId: detail.conversationId,
    actorRole: role,
  });
  const moderationState = moderation.allowed && !stage9Protection.hadProtection ? "approved" : "requires_review";

  const { data: chatMessage, error } = await supabase
    .from("recruitment_interview_chat_messages")
    .insert({
      interview_id: interviewId,
      conversation_id: detail.conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: role,
      body: input.body,
      moderation_state: moderationState,
      contains_contact_attempt: !moderation.allowed || stage9Protection.hadProtection,
      visible_to_employer: moderationState === "approved",
      visible_to_candidate: moderationState === "approved",
      visible_to_staff: true,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interviewId,
    conversation_id: detail.conversationId,
    actor_auth_user_id: auth.userId,
    actor_role: role,
    event_type: moderationState === "approved" ? "chat_message_posted" : "chat_message_held_for_review",
    details: { moderationState, stage9Findings: stage9Protection.findings },
  });

  if (moderationState !== "approved") {
    await supabase.from("recruitment_interview_chat_messages").insert({
      interview_id: interviewId,
      conversation_id: detail.conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: role,
      body: stage9Protection.protectedText,
      moderation_state: "approved",
      contains_contact_attempt: true,
      visible_to_employer: true,
      visible_to_candidate: true,
      visible_to_staff: true,
    });
  }

  return {
    chatMessage,
    moderationState,
  };
}

export async function updateRecruitmentInterview(auth: AuthContext, interviewId: string, input: {
  status?: "scheduled" | "waiting" | "live" | "completed" | "cancelled" | "no_show";
  interviewResult?: string | null;
  interviewNotes?: string | null;
  scheduledAt?: string;
  durationMinutes?: number;
  hostAction?: "start" | "end";
}) {
  const supabase = createSupabaseAdminClient();
  const { data: interview, error } = await supabase.from("recruitment_interviews").select("*").eq("id", interviewId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!interview) throw new Error("Interview not found");

  const { conversation } = await loadConversationForActor(auth, String(interview.conversation_id));
  if (!isPrimeGlobalStaffRole(auth.role) && auth.userId !== conversation.assigned_staff_id) {
    throw new Error("Only Prime Global staff may manage interview sessions");
  }

  const patch: Record<string, unknown> = {};
  if (input.status) patch.status = input.status;
  if (input.interviewResult !== undefined) patch.interview_result = input.interviewResult;
  if (input.interviewNotes !== undefined) patch.interview_notes = input.interviewNotes;
  if (input.scheduledAt) patch.scheduled_at = input.scheduledAt;
  if (input.durationMinutes) patch.duration_minutes = input.durationMinutes;
  if (input.hostAction === "start") {
    const latestTermsVersion = getLatestCoordinationTermsVersion(interview);
    const [candidateInvitationAccepted, employerInvitationAccepted, candidateTermsAccepted, employerTermsAccepted] = await Promise.all([
      hasAcceptedInterviewInvitation(supabase, interviewId, "candidate"),
      hasAcceptedInterviewInvitation(supabase, interviewId, "employer"),
      hasAcceptedLatestTerms(supabase, interviewId, "candidate", latestTermsVersion),
      hasAcceptedLatestTerms(supabase, interviewId, "employer", latestTermsVersion),
    ]);

    const metadata = (interview.meeting_metadata as Record<string, unknown> | null) ?? {};
    const protection = (metadata.protection as Record<string, unknown> | null) ?? {};
    const hasCriticalProtectionIssue = Boolean(protection.criticalUnresolvedIssue);
    const scheduledAtTs = new Date(String(interview.scheduled_at ?? "")).getTime();
    const isScheduleValid = Number.isFinite(scheduledAtTs) && scheduledAtTs > 0;

    if (String(interview.status ?? "scheduled") === "completed") {
      throw new Error("Interview room cannot be reused after closure");
    }

    if (!candidateInvitationAccepted) throw new Error("Candidate must accept interview invitation before activation");
    if (!employerInvitationAccepted) throw new Error("Employer must accept interview invitation before activation");
    if (!candidateTermsAccepted || !employerTermsAccepted) {
      throw new Error("Both employer and candidate must accept the latest coordination terms");
    }
    if (!conversation.related_application_id) {
      throw new Error("Candidate selection scope is required before activation");
    }
    if (String(conversation.status ?? "") === "paused") {
      throw new Error("Interview activation is blocked while staff freeze is active");
    }
    if (hasCriticalProtectionIssue || Boolean(conversation.escalated_to_admin)) {
      throw new Error("Critical unresolved protection issue blocks activation");
    }
    if (!isScheduleValid) throw new Error("Interview schedule is invalid");

    const protectedRecord = toProtectedInterviewRecord({
      interview,
      conversation,
    });
    const activationPolicy = enforceProtectedInterviewPolicy({
      interview: protectedRecord,
      action: "activate",
      metadata: interview.meeting_metadata as Record<string, unknown> | undefined,
    });
    if (!activationPolicy.allowed) {
      throw new Error(activationPolicy.reasons.join(" "));
    }

    patch.status = "live";
    patch.host_started_at = new Date().toISOString();
  }
  if (input.hostAction === "end") {
    patch.status = "completed";
    const endedAt = new Date().toISOString();
    patch.host_ended_at = endedAt;

    const startedAt = interview.host_started_at ? new Date(String(interview.host_started_at)).getTime() : NaN;
    const endedAtTs = new Date(endedAt).getTime();
    if (Number.isFinite(startedAt) && Number.isFinite(endedAtTs) && endedAtTs >= startedAt) {
      patch.meeting_duration_seconds = Math.floor((endedAtTs - startedAt) / 1000);
    }
  }

  const { data, error: updateError } = await supabase
    .from("recruitment_interviews")
    .update(patch)
    .eq("id", interviewId)
    .select("*")
    .single();

  if (updateError) throw new Error(updateError.message);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: `recruitment.interview.${input.hostAction ?? 'updated'}`,
    targetType: "recruitment_interview",
    targetId: interviewId,
    metadata: patch,
  });

  await supabase.from("recruitment_interview_events").insert({
    interview_id: interviewId,
    conversation_id: String(interview.conversation_id),
    actor_auth_user_id: auth.userId,
    actor_role: getConversationParticipantRole(auth.role),
    event_type:
      input.hostAction === "start"
        ? "interview_started"
        : input.hostAction === "end"
          ? "interview_ended"
          : "interview_updated",
    details: patch,
  });

  return data;
}

export async function moderateRecruitmentMessage(auth: AuthContext, messageId: string, input: { action: "approve" | "reject"; locale: string }) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may moderate blocked messages");
  }

  const supabase = createSupabaseAdminClient();
  const { data: message, error } = await supabase.from("recruitment_messages").select("*").eq("id", messageId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!message) throw new Error("Message not found");

  await loadConversationForActor(auth, String(message.conversation_id));

  const patch =
    input.action === "approve"
      ? { moderation_state: "approved", visible_to_employer: true, visible_to_candidate: true, visible_to_staff: true }
      : { moderation_state: "rejected", visible_to_employer: false, visible_to_candidate: false, visible_to_staff: true };

  const { data, error: updateError } = await supabase
    .from("recruitment_messages")
    .update(patch)
    .eq("id", messageId)
    .select("*")
    .single();
  if (updateError) throw new Error(updateError.message);

  await supabase.from("recruitment_moderation_events").insert({
    conversation_id: message.conversation_id,
    message_id: messageId,
    actor_auth_user_id: auth.userId,
    event_type: input.action === "approve" ? "message_approved" : "message_rejected",
    moderation_state: patch.moderation_state,
    details: {},
  });

  await supabase.from("recruitment_messages").insert({
    conversation_id: message.conversation_id,
    sender_auth_user_id: auth.userId,
    sender_role: "system",
    message_type: "system",
    body:
      input.action === "approve"
        ? input.locale === "ar"
          ? "راجعت برايم جلوبال الرسالة وسمحت بنشرها داخل المحادثة الخاضعة للإشراف."
          : "Prime Global reviewed the message and approved it for the supervised conversation."
        : input.locale === "ar"
          ? "رفضت برايم جلوبال الرسالة بسبب محاولة مشاركة بيانات تواصل مباشرة أو رابط خارجي."
          : "Prime Global rejected the message because it attempted to share direct contact data or an external link.",
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: `recruitment.message.${input.action}`,
    targetType: "recruitment_message",
    targetId: messageId,
  });

  return data;
}

export async function getStaffRecruitmentOverview(auth: AuthContext, locale: string) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may access this view");
  }

  const supabase = createSupabaseAdminClient();
  const [requests, conversations, moderationQueue, auditHistory] = await Promise.all([
    listConversationRequestsForActor(auth, locale),
    listConversationsForActor(auth, locale),
    supabase
      .from("recruitment_messages")
      .select("id, conversation_id, body, created_at, sender_role")
      .eq("moderation_state", "requires_review")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("audit_logs")
      .select("id, action, target_type, target_id, metadata, created_at")
      .ilike("action", "recruitment.%")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (moderationQueue.error) throw new Error(moderationQueue.error.message);
  if (auditHistory.error) throw new Error(auditHistory.error.message);

  return {
    requests,
    conversations,
    moderationQueue: moderationQueue.data ?? [],
    auditHistory: auditHistory.data ?? [],
  };
}

export async function executeAiSupervisorAction(auth: AuthContext, conversationId: string, input: {
  action: "assist" | "handover" | "set_awaiting_staff" | "set_staff_active";
  taskType?: string;
  message?: string;
  locale: string;
}) {
  if (!isPrimeGlobalStaffRole(auth.role)) {
    throw new Error("Only Prime Global staff may run AI supervisor controls");
  }

  const { conversation } = await loadConversationForActor(auth, conversationId);
  const supabase = createSupabaseAdminClient();

  if (input.action === "set_awaiting_staff") {
    const { data, error } = await supabase
      .from("recruitment_conversations")
      .update({ conversation_mode: "awaiting_staff", updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  if (input.action === "set_staff_active" || input.action === "handover") {
    return updateConversationForStaff(auth, conversationId, {
      conversationMode: "staff_active",
      status: "active",
    });
  }

  const taskType = input.taskType ?? "process_qna";
  if (!canPrimeGlobalAiPerformTask(taskType)) {
    throw new Error("AI Supervisor task is not permitted");
  }

  const messageText = (input.message ?? "").toLowerCase();
  if (
    /approve|reject|offer accepted|offer rejected|compensation approved|contract signed|final decision|hired|not hired/.test(
      messageText
    )
  ) {
    throw new Error("AI Supervisor cannot perform final hiring, compensation, or legal decisions");
  }

  const currentMode = String(conversation.conversation_mode ?? "staff_active");
  if (currentMode !== "ai_supervised" && currentMode !== "awaiting_staff") {
    throw new Error("AI Supervisor can assist only in ai_supervised or awaiting_staff mode");
  }

  const aiMessage =
    input.message?.trim() ||
    (input.locale === "ar"
      ? "مساعد برايم جلوبال الذكي متاح حاليًا للمساعدة في الأسئلة العامة، تنسيق المواعيد، والتذكير."
      : "Prime Global AI Assistant is currently available for process questions, scheduling suggestions, and reminders.");

  const { data: message, error: messageError } = await supabase
    .from("recruitment_messages")
    .insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: "prime_global_ai",
      actor_type: "prime_global_ai",
      ai_task_type: taskType,
      message_type: "system",
      body: aiMessage,
      moderation_state: "approved",
      visible_to_employer: true,
      visible_to_candidate: true,
      visible_to_staff: true,
    })
    .select("*")
    .single();

  if (messageError) throw new Error(messageError.message);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.ai_supervisor.assist",
    targetType: "recruitment_conversation",
    targetId: conversationId,
    metadata: { taskType },
  });

  return { message };
}

export function toHttpError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    if (error.message === "Forbidden") {
      return forbiddenResponse("Insufficient access to this supervised conversation");
    }

    return { message: error.message };
  }

  return { message: fallbackMessage };
}