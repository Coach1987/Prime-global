import { createAuditLog } from "@/lib/server/security/audit";
import { AppRole, AuthContext, forbiddenResponse } from "@/lib/server/security/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { getCandidateByAuthUserId } from "@/lib/server/candidates";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import {
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

  const candidateProfiles = await loadCandidatePublicProfiles(Array.from(new Set((data ?? []).map((row) => String(row.candidate_id ?? "")))));
  const employers = await loadEmployers(Array.from(new Set((data ?? []).map((row) => String(row.employer_id ?? "")))));

  return (data ?? []).map((row) => mapConversationSummary(row, locale, candidateProfiles, employers));
}

export async function getConversationDetail(auth: AuthContext, conversationId: string, locale: string) {
  const { actor, conversation } = await loadConversationForActor(auth, conversationId);
  const supabase = createSupabaseAdminClient();

  const [messagesResult, attachmentsResult, participantsResult, notesResult, interviewsResult] = await Promise.all([
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
  ]);

  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (attachmentsResult.error) throw new Error(attachmentsResult.error.message);
  if (participantsResult.error) throw new Error(participantsResult.error.message);
  if (notesResult.error) throw new Error(notesResult.error.message);
  if (interviewsResult.error) throw new Error(interviewsResult.error.message);

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
    permissions: {
      canSendMessages: conversation.status === "active" || actor.scope === "staff",
      canRespondToInvitation: actor.scope === "candidate" && conversation.status === "pending_candidate_acceptance",
      canModerate: actor.scope === "staff",
      canAddInternalNotes: actor.scope === "staff",
      canScheduleInterview: actor.scope === "staff" && conversation.status === "active",
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

  const moderation = moderateRecruitmentMessageContent(input.body);
  const senderRole = getConversationParticipantRole(auth.role);
  const now = new Date().toISOString();

  const { data: message, error: messageError } = await supabase
    .from("recruitment_messages")
    .insert({
      conversation_id: conversationId,
      sender_auth_user_id: auth.userId,
      sender_role: senderRole,
      message_type: moderation.state === "requires_review" ? "moderation" : "text",
      body: input.body,
      moderation_state: moderation.state,
      contains_contact_attempt: moderation.containsContactAttempt,
      visible_to_employer: moderation.state === "approved",
      visible_to_candidate: moderation.state === "approved",
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

  if (moderation.state === "requires_review") {
    await supabase.from("recruitment_moderation_events").insert({
      conversation_id: conversationId,
      message_id: message.id,
      actor_auth_user_id: auth.userId,
      event_type: "contact_data_detected",
      moderation_state: moderation.state,
      details: { reasons: moderation.reasons },
    });

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "recruitment.message.contact_attempt_detected",
      targetType: "recruitment_message",
      targetId: message.id,
      metadata: { conversationId, reasons: moderation.reasons },
    });

    const { data: systemMessage, error: systemMessageError } = await supabase
      .from("recruitment_messages")
      .insert({
        conversation_id: conversationId,
        sender_auth_user_id: conversation.assigned_staff_id,
        sender_role: "system",
        message_type: "system",
        body: getModerationHoldMessage(input.locale),
      })
      .select("*")
      .single();

    if (systemMessageError) throw new Error(systemMessageError.message);

    await insertNotifications(supabase, [
      {
        authUserId: String(conversation.assigned_staff_id),
        category: "message",
        title: input.locale === "ar" ? "رسالة تحتاج إلى مراجعة" : "Message requires review",
        body: input.locale === "ar" ? "تم رصد محاولة مشاركة بيانات تواصل مباشرة داخل محادثة خاضعة للإشراف." : "A supervised conversation message was held for direct-contact review.",
        entityType: "recruitment_message",
        entityId: message.id,
      },
    ]);

    return { message: systemMessage, moderatedMessageId: message.id, moderationState: moderation.state };
  }

  const recipientIds = [conversation.employer_auth_user_id, conversation.candidate_auth_user_id, conversation.assigned_staff_id]
    .filter((userId) => userId && userId !== auth.userId) as string[];

  await insertNotifications(
    supabase,
    recipientIds.map((userId) => ({
      authUserId: userId,
      category: "message",
      title: input.locale === "ar" ? "رسالة جديدة داخل محادثة خاضعة للإشراف" : "New message in a supervised conversation",
      body: input.body.slice(0, 180),
      entityType: "recruitment_conversation",
      entityId: conversationId,
    }))
  );

  return { message, moderatedMessageId: null, moderationState: moderation.state };
}

export async function updateConversationForStaff(auth: AuthContext, conversationId: string, input: {
  status?: "active" | "paused" | "closed" | "archived";
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
    patch.status = "live";
    patch.host_started_at = new Date().toISOString();
  }
  if (input.hostAction === "end") {
    patch.status = "completed";
    patch.host_ended_at = new Date().toISOString();
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

export function toHttpError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    if (error.message === "Forbidden") {
      return forbiddenResponse("Insufficient access to this supervised conversation");
    }

    return { message: error.message };
  }

  return { message: fallbackMessage };
}