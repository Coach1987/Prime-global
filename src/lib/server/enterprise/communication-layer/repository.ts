import { createSupabaseAdminClient } from "../../supabase.ts";
import type { CommunicationEventInput } from "./types.ts";

async function listRows<T>(table: string, organizationId?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function createRow<T>(table: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data as T;
}

export async function recordCommunicationEvent(input: CommunicationEventInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("pgems_record_communication_event", {
    p_organization_id: input.organizationId ?? null,
    p_event_type: input.eventType,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_source_domain: input.sourceDomain,
    p_source_reference: input.sourceReference ?? null,
    p_actor_auth_user_id: input.actorAuthUserId ?? null,
    p_actor_role: input.actorRole ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_payload: input.payload ?? {},
    p_metadata: input.metadata ?? {},
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw error;
  return data;
}

export async function listCorporateMailIdentities(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_corporate_mail_identities", organizationId);
}

export async function createCorporateMailIdentity(payload: {
  organizationId: string;
  employeeId?: string;
  identityType: "individual" | "shared" | "department" | "role" | "system";
  localPart: string;
  domain: string;
  displayName: string;
  status: "active" | "suspended" | "archived";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_corporate_mail_identities", {
    organization_id: payload.organizationId,
    employee_id: payload.employeeId ?? null,
    identity_type: payload.identityType,
    local_part: payload.localPart,
    domain: payload.domain,
    display_name: payload.displayName,
    status: payload.status,
    metadata: payload.metadata ?? {},
  });
}

export async function listMailboxes(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_mailboxes", organizationId);
}

export async function createMailbox(payload: {
  organizationId: string;
  mailboxCode: string;
  mailboxType: "shared" | "department" | "role" | "system";
  name: string;
  identityId: string;
  departmentId?: string;
  roleId?: string;
  retentionPolicyId?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}) {
  return createRow<Record<string, unknown>>("pgems_mailboxes", {
    organization_id: payload.organizationId,
    mailbox_code: payload.mailboxCode,
    mailbox_type: payload.mailboxType,
    name: payload.name,
    identity_id: payload.identityId,
    department_id: payload.departmentId ?? null,
    role_id: payload.roleId ?? null,
    retention_policy_id: payload.retentionPolicyId ?? null,
    metadata: payload.metadata ?? {},
    is_active: payload.isActive ?? true,
  });
}

export async function addMailboxMember(payload: {
  mailboxId: string;
  employeeId: string;
  memberRole: "owner" | "manager" | "sender" | "viewer" | "auditor";
  canSend?: boolean;
  canManage?: boolean;
}) {
  return createRow<Record<string, unknown>>("pgems_mailbox_members", {
    mailbox_id: payload.mailboxId,
    employee_id: payload.employeeId,
    member_role: payload.memberRole,
    can_send: payload.canSend ?? false,
    can_manage: payload.canManage ?? false,
  });
}

export async function listRetentionPolicies(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_communication_retention_policies", organizationId);
}

export async function createRetentionPolicy(payload: {
  organizationId: string;
  code: string;
  name: string;
  channelScope: "email" | "in_app" | "sms" | "whatsapp" | "push" | "all";
  retentionDays: number;
  legalHoldSupported?: boolean;
  autoArchive?: boolean;
  autoDelete?: boolean;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_retention_policies", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    channel_scope: payload.channelScope,
    retention_days: payload.retentionDays,
    legal_hold_supported: payload.legalHoldSupported ?? true,
    auto_archive: payload.autoArchive ?? true,
    auto_delete: payload.autoDelete ?? false,
    metadata: payload.metadata ?? {},
    is_active: payload.isActive ?? true,
  });
}

export async function listCommunicationTemplates(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_communication_templates", organizationId);
}

export async function createCommunicationTemplate(payload: {
  organizationId: string;
  code: string;
  name: string;
  templateType: "email" | "sms" | "whatsapp" | "notification" | "announcement";
  category: string;
  status: "draft" | "in_review" | "approved" | "rejected" | "retired";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_templates", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    template_type: payload.templateType,
    category: payload.category,
    status: payload.status,
    metadata: payload.metadata ?? {},
  });
}

export async function createTemplateVersion(payload: {
  templateId: string;
  versionNumber: number;
  approvalStatus: "draft" | "in_review" | "approved" | "rejected";
  changeSummary?: string;
  content: Record<string, unknown>;
  createdByAuthUserId?: string;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_template_versions", {
    template_id: payload.templateId,
    version_number: payload.versionNumber,
    approval_status: payload.approvalStatus,
    change_summary: payload.changeSummary ?? null,
    content: payload.content,
    created_by_auth_user_id: payload.createdByAuthUserId ?? null,
  });
}

export async function createTemplateLocalization(payload: {
  templateVersionId: string;
  locale: string;
  title?: string;
  body: string;
  variables?: unknown[];
  fallbackLocale?: string;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_template_localizations", {
    template_version_id: payload.templateVersionId,
    locale: payload.locale,
    title: payload.title ?? null,
    body: payload.body,
    variables: payload.variables ?? [],
    fallback_locale: payload.fallbackLocale ?? null,
  });
}

export async function createTemplateApprovalRequest(payload: {
  templateVersionId: string;
  reviewerRoleCode?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedByAuthUserId?: string;
  decisionByAuthUserId?: string;
  decisionNote?: string;
}) {
  return createRow<Record<string, unknown>>("pgems_template_approval_requests", {
    template_version_id: payload.templateVersionId,
    reviewer_role_code: payload.reviewerRoleCode ?? null,
    status: payload.status,
    requested_by_auth_user_id: payload.requestedByAuthUserId ?? null,
    decision_by_auth_user_id: payload.decisionByAuthUserId ?? null,
    decision_note: payload.decisionNote ?? null,
    decided_at: payload.status === "approved" || payload.status === "rejected" ? new Date().toISOString() : null,
  });
}

export async function listInternalMessages(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_internal_messages", organizationId);
}

export async function createInternalMessage(payload: {
  organizationId: string;
  messageType: "department" | "management" | "employee_announcement" | "system_broadcast";
  departmentId?: string;
  senderEmployeeId?: string;
  senderRoleCode?: string;
  title: string;
  body: string;
  sensitivity: "normal" | "sensitive" | "restricted";
  pinned?: boolean;
  pinnedUntil?: string;
  metadata?: Record<string, unknown>;
  recipientEmployeeIds?: string[];
}) {
  const supabase = createSupabaseAdminClient();
  const { data: message, error: messageError } = await supabase
    .from("pgems_internal_messages")
    .insert({
      organization_id: payload.organizationId,
      message_type: payload.messageType,
      department_id: payload.departmentId ?? null,
      sender_employee_id: payload.senderEmployeeId ?? null,
      sender_role_code: payload.senderRoleCode ?? null,
      title: payload.title,
      body: payload.body,
      sensitivity: payload.sensitivity,
      pinned: payload.pinned ?? false,
      pinned_until: payload.pinnedUntil ?? null,
      metadata: payload.metadata ?? {},
    })
    .select("*")
    .single();

  if (messageError) throw messageError;

  const recipients = payload.recipientEmployeeIds ?? [];
  if (recipients.length > 0) {
    const { error: recipientsError } = await supabase.from("pgems_internal_message_recipients").insert(
      recipients.map((recipientEmployeeId) => ({
        message_id: message.id,
        recipient_employee_id: recipientEmployeeId,
        recipient_scope: "direct",
      }))
    );

    if (recipientsError) throw recipientsError;
  }

  return message;
}

export async function acknowledgeInternalMessage(payload: {
  messageId: string;
  recipientEmployeeId: string;
  acknowledgementNote?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_internal_message_receipts")
    .upsert(
      {
        message_id: payload.messageId,
        recipient_employee_id: payload.recipientEmployeeId,
        read_at: new Date().toISOString(),
        acknowledged_at: new Date().toISOString(),
        acknowledgement_note: payload.acknowledgementNote ?? null,
      },
      { onConflict: "message_id,recipient_employee_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listCommunicationProviderConfigs(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_communication_provider_configs", organizationId);
}

export async function createCommunicationProviderConfig(payload: {
  organizationId: string;
  providerId: string;
  mode: "test" | "live";
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  priority?: number;
  isFallback?: boolean;
  isActive?: boolean;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_provider_configs", {
    organization_id: payload.organizationId,
    provider_id: payload.providerId,
    mode: payload.mode,
    config: payload.config,
    metadata: payload.metadata ?? {},
    priority: payload.priority ?? 100,
    is_fallback: payload.isFallback ?? false,
    is_active: payload.isActive ?? true,
  });
}

export async function createCommunicationEventSubscription(payload: {
  organizationId: string;
  sourceDomain: "recruitment" | "payments" | "billing" | "interviews" | "documents" | "ai" | "security" | "system";
  sourceEventCode: string;
  templateId?: string;
  notificationRuleId?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_event_subscriptions", {
    organization_id: payload.organizationId,
    source_domain: payload.sourceDomain,
    source_event_code: payload.sourceEventCode,
    template_id: payload.templateId ?? null,
    notification_rule_id: payload.notificationRuleId ?? null,
    enabled: payload.enabled ?? true,
    metadata: payload.metadata ?? {},
  });
}

export async function listCommunicationEvents(organizationId?: string) {
  return listRows<Record<string, unknown>>("pgems_communication_events", organizationId);
}

export async function listCommunicationDeliveries(organizationId?: string) {
  return listRows<Record<string, unknown>>("pgems_communication_deliveries", organizationId);
}

export async function createCommunicationDelivery(payload: {
  organizationId?: string;
  messageRef: string;
  channelType: "email" | "sms" | "whatsapp" | "push" | "in_app";
  providerConfigId?: string;
  recipientRef: string;
  status: "queued" | "processing" | "sent" | "delivered" | "failed" | "cancelled";
  priority: "low" | "normal" | "high" | "critical" | "emergency";
  maxAttempts?: number;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_deliveries", {
    organization_id: payload.organizationId ?? null,
    message_ref: payload.messageRef,
    channel_type: payload.channelType,
    provider_config_id: payload.providerConfigId ?? null,
    recipient_ref: payload.recipientRef,
    status: payload.status,
    priority: payload.priority,
    max_attempts: payload.maxAttempts ?? 5,
    metadata: payload.metadata ?? {},
  });
}

export async function appendCommunicationComplianceLog(payload: {
  organizationId?: string;
  actionCode: string;
  actorAuthUserId?: string;
  actorRole?: string;
  subjectType?: string;
  subjectId?: string;
  outcome: "success" | "failure" | "manual_review";
  details?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_communication_compliance_logs", {
    organization_id: payload.organizationId ?? null,
    action_code: payload.actionCode,
    actor_auth_user_id: payload.actorAuthUserId ?? null,
    actor_role: payload.actorRole ?? null,
    subject_type: payload.subjectType ?? null,
    subject_id: payload.subjectId ?? null,
    outcome: payload.outcome,
    details: payload.details ?? {},
  });
}
