import { createSupabaseAdminClient } from "../../supabase.ts";
import { canTransitionNotificationStatus } from "./lifecycle.ts";
import { isPreferenceMuted, resolvePreferredLocale } from "./preferences.ts";
import { renderNotificationTemplate } from "./template.ts";
import type {
  ConsumeEventResult,
  NotificationAuditRecord,
  NotificationChannelRecord,
  NotificationDeliveryRecord,
  NotificationHistoryRecord,
  NotificationPreferenceRecord,
  NotificationQueueRecord,
  NotificationRecord,
  NotificationRetryRecord,
  NotificationRuleRecord,
  NotificationTemplateRecord,
} from "./types.ts";

async function listRows<T>(table: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as T[];
}

async function createRow<T>(table: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data as T;
}

async function updateRow<T>(table: string, filter: Record<string, unknown>, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).update(payload).select("*");
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.single();
  if (error) throw error;
  return data as T;
}

export async function listNotificationChannels() {
  return listRows<NotificationChannelRecord>("pgems_notification_channels");
}

export async function createNotificationChannel(payload: {
  code: string;
  name: string;
  channelKind: NotificationChannelRecord["channel_kind"];
  description?: string | null;
  config: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<NotificationChannelRecord>("pgems_notification_channels", {
    code: payload.code,
    name: payload.name,
    channel_kind: payload.channelKind,
    description: payload.description ?? null,
    config: payload.config,
    is_active: payload.isActive,
  });
}

export async function listNotificationTemplates() {
  return listRows<NotificationTemplateRecord>("pgems_notification_templates");
}

export async function createNotificationTemplate(payload: {
  code: string;
  name: string;
  channelId: string;
  locale: string;
  titleTemplate: string;
  bodyTemplate: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<NotificationTemplateRecord>("pgems_notification_templates", {
    code: payload.code,
    name: payload.name,
    channel_id: payload.channelId,
    locale: payload.locale,
    title_template: payload.titleTemplate,
    body_template: payload.bodyTemplate,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listNotificationRules() {
  return listRows<NotificationRuleRecord>("pgems_notification_rules");
}

export async function createNotificationRule(payload: {
  code: string;
  name: string;
  eventTypeId?: string;
  eventCategoryId?: string;
  channelId: string;
  templateId: string;
  defaultPriority: NotificationRuleRecord["default_priority"];
  recipientStrategy: NotificationRuleRecord["recipient_strategy"];
  fixedRecipientKey?: string;
  locale: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<NotificationRuleRecord>("pgems_notification_rules", {
    code: payload.code,
    name: payload.name,
    event_type_id: payload.eventTypeId ?? null,
    event_category_id: payload.eventCategoryId ?? null,
    channel_id: payload.channelId,
    template_id: payload.templateId,
    default_priority: payload.defaultPriority,
    recipient_strategy: payload.recipientStrategy,
    fixed_recipient_key: payload.fixedRecipientKey ?? null,
    locale: payload.locale,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listNotificationPreferences() {
  return listRows<NotificationPreferenceRecord>("pgems_notification_preferences");
}

export async function createNotificationPreference(payload: {
  recipientKey: string;
  channelId: string;
  ruleCode?: string;
  locale: string;
  muteUntil?: string;
  quietHours: Record<string, unknown>;
  enabled: boolean;
  metadata: Record<string, unknown>;
}) {
  return createRow<NotificationPreferenceRecord>("pgems_notification_preferences", {
    recipient_key: payload.recipientKey,
    channel_id: payload.channelId,
    rule_code: payload.ruleCode ?? null,
    locale: payload.locale,
    mute_until: payload.muteUntil ?? null,
    quiet_hours: payload.quietHours,
    enabled: payload.enabled,
    metadata: payload.metadata,
  });
}

export async function listNotificationQueues() {
  return listRows<NotificationQueueRecord>("pgems_notification_queues");
}

export async function createNotificationQueue(payload: {
  channelId: string;
  code: string;
  name: string;
  orderingMode: NotificationQueueRecord["ordering_mode"];
  duplicateWindowSeconds: number;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<NotificationQueueRecord>("pgems_notification_queues", {
    channel_id: payload.channelId,
    code: payload.code,
    name: payload.name,
    ordering_mode: payload.orderingMode,
    duplicate_window_seconds: payload.duplicateWindowSeconds,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listNotifications(filters?: Partial<{ recipientKey: string; status: NotificationRecord["status"]; priority: NotificationRecord["priority"]; channelId: string; sourceEventId: string; includeDeleted: boolean; includeArchived: boolean }>) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("pgems_notifications").select("*").order("created_at", { ascending: false });

  if (filters?.recipientKey) query = query.eq("recipient_key", filters.recipientKey);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.channelId) query = query.eq("channel_id", filters.channelId);
  if (filters?.sourceEventId) query = query.eq("source_event_id", filters.sourceEventId);
  if (!filters?.includeDeleted) query = query.is("deleted_at", null);
  if (!filters?.includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NotificationRecord[];
}

export async function createNotification(payload: {
  notificationCode: string;
  recipientKey: string;
  channelId: string;
  templateId?: string;
  queueId?: string;
  sourceEventId?: string;
  sourceEventTypeId?: string;
  sourceEventCategoryId?: string;
  locale: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  priority: NotificationRecord["priority"];
  status: NotificationRecord["status"];
  scheduledAt?: string;
  availableAt?: string;
  maxRetryCount: number;
}) {
  const availableAt = payload.availableAt ?? payload.scheduledAt ?? new Date().toISOString();
  const created = await createRow<NotificationRecord>("pgems_notifications", {
    notification_code: payload.notificationCode,
    recipient_key: payload.recipientKey,
    channel_id: payload.channelId,
    template_id: payload.templateId ?? null,
    queue_id: payload.queueId ?? null,
    source_event_id: payload.sourceEventId ?? null,
    source_event_type_id: payload.sourceEventTypeId ?? null,
    source_event_category_id: payload.sourceEventCategoryId ?? null,
    locale: payload.locale,
    title: payload.title,
    body: payload.body,
    payload: payload.payload,
    metadata: payload.metadata,
    priority: payload.priority,
    status: payload.status,
    retry_count: 0,
    max_retry_count: payload.maxRetryCount,
    scheduled_at: payload.scheduledAt ?? null,
    available_at: availableAt,
  });

  await appendNotificationHistory({
    notificationId: created.id,
    entryType: "created",
    message: "Notification created",
    metadata: { status: created.status, priority: created.priority },
  });

  return created;
}

export async function createBulkNotifications(payload: {
  notificationCode: string;
  recipientKeys: string[];
  channelId: string;
  templateId?: string;
  queueId?: string;
  sourceEventId?: string;
  locale: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  priority: NotificationRecord["priority"];
  status: NotificationRecord["status"];
  scheduledAt?: string;
  availableAt?: string;
  maxRetryCount: number;
}) {
  const created: NotificationRecord[] = [];
  for (const recipientKey of payload.recipientKeys) {
    const record = await createNotification({
      notificationCode: payload.notificationCode,
      recipientKey,
      channelId: payload.channelId,
      templateId: payload.templateId,
      queueId: payload.queueId,
      sourceEventId: payload.sourceEventId,
      locale: payload.locale,
      title: payload.title,
      body: payload.body,
      payload: payload.payload,
      metadata: payload.metadata,
      priority: payload.priority,
      status: payload.status,
      scheduledAt: payload.scheduledAt,
      availableAt: payload.availableAt,
      maxRetryCount: payload.maxRetryCount,
    });
    created.push(record);
  }
  return created;
}

export async function markNotificationRead(notificationId: string, read: boolean) {
  const fromStatus = read ? "delivered" : "read";
  const toStatus = read ? "read" : "unread";
  const transition = canTransitionNotificationStatus(fromStatus, toStatus);
  if (!transition.allowed) throw new Error(transition.reason);

  const updated = await updateRow<NotificationRecord>("pgems_notifications", { id: notificationId }, {
    status: toStatus,
    read_at: read ? new Date().toISOString() : null,
  });

  await appendNotificationHistory({
    notificationId,
    entryType: read ? "read" : "unread",
    message: read ? "Notification marked as read" : "Notification marked as unread",
    metadata: {},
  });

  return updated;
}

export async function archiveNotification(notificationId: string, archived: boolean) {
  const updated = await updateRow<NotificationRecord>("pgems_notifications", { id: notificationId }, {
    status: archived ? "archived" : "unread",
    archived_at: archived ? new Date().toISOString() : null,
  });

  await appendNotificationHistory({
    notificationId,
    entryType: archived ? "archived" : "unarchived",
    message: archived ? "Notification archived" : "Notification restored from archive",
    metadata: {},
  });

  return updated;
}

export async function softDeleteNotification(notificationId: string, reason: string) {
  const updated = await updateRow<NotificationRecord>("pgems_notifications", { id: notificationId }, {
    status: "deleted",
    deleted_at: new Date().toISOString(),
    delete_reason: reason,
  });

  await appendNotificationHistory({
    notificationId,
    entryType: "soft_deleted",
    message: "Notification soft deleted",
    metadata: { reason },
  });

  return updated;
}

export async function listNotificationDeliveries() {
  return listRows<NotificationDeliveryRecord>("pgems_notification_deliveries");
}

export async function createNotificationDelivery(payload: {
  notificationId: string;
  channelId: string;
  targetAddress: string;
  status: NotificationDeliveryRecord["status"];
  responseMetadata: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  nextRetryAt?: string;
}) {
  return createRow<NotificationDeliveryRecord>("pgems_notification_deliveries", {
    notification_id: payload.notificationId,
    channel_id: payload.channelId,
    target_address: payload.targetAddress,
    status: payload.status,
    attempts: 0,
    response_metadata: payload.responseMetadata,
    error_code: payload.errorCode ?? null,
    error_message: payload.errorMessage ?? null,
    next_retry_at: payload.nextRetryAt ?? null,
  });
}

export async function listNotificationRetries() {
  return listRows<NotificationRetryRecord>("pgems_notification_retries");
}

export async function retryNotification(payload: {
  notificationId: string;
  deliveryId?: string;
  reason: string;
  delaySeconds: number;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: notification, error } = await supabase
    .from("pgems_notifications")
    .select("id, retry_count, max_retry_count")
    .eq("id", payload.notificationId)
    .single();

  if (error) throw error;

  const retryCount = Number(notification.retry_count ?? 0) + 1;
  const maxRetryCount = Number(notification.max_retry_count ?? 0);
  if (retryCount > maxRetryCount) {
    throw new Error("notification_retry_limit_exceeded");
  }

  const nextRetryAt = new Date(Date.now() + payload.delaySeconds * 1000).toISOString();
  await updateRow<NotificationRecord>("pgems_notifications", { id: payload.notificationId }, {
    status: "queued",
    retry_count: retryCount,
    available_at: nextRetryAt,
  });

  const retry = await createRow<NotificationRetryRecord>("pgems_notification_retries", {
    notification_id: payload.notificationId,
    delivery_id: payload.deliveryId ?? null,
    retry_number: retryCount,
    status: "queued",
    reason: payload.reason,
    metadata: payload.metadata,
    scheduled_at: nextRetryAt,
    executed_at: null,
  });

  await appendNotificationHistory({
    notificationId: payload.notificationId,
    entryType: "retry_scheduled",
    message: "Notification retry scheduled",
    metadata: { retryId: retry.id, retryNumber: retryCount, nextRetryAt },
  });

  return retry;
}

export async function listNotificationHistory() {
  return listRows<NotificationHistoryRecord>("pgems_notification_history");
}

export async function appendNotificationHistory(payload: {
  notificationId: string;
  entryType: string;
  message: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<NotificationHistoryRecord>("pgems_notification_history", {
    notification_id: payload.notificationId,
    entry_type: payload.entryType,
    message: payload.message,
    metadata: payload.metadata,
  });
}

export async function listNotificationAudit() {
  return listRows<NotificationAuditRecord>("pgems_notification_audit");
}

export async function appendNotificationAudit(payload: {
  notificationId?: string;
  actionCode: string;
  actorType: NotificationAuditRecord["actor_type"];
  actorKey: string;
  outcome: NotificationAuditRecord["outcome"];
  reason?: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<NotificationAuditRecord>("pgems_notification_audit", {
    notification_id: payload.notificationId ?? null,
    action_code: payload.actionCode,
    actor_type: payload.actorType,
    actor_key: payload.actorKey,
    outcome: payload.outcome,
    reason: payload.reason ?? null,
    metadata: payload.metadata,
  });
}

function resolveRecipientsFromRule(params: {
  rule: NotificationRuleRecord;
  eventPayload: Record<string, unknown>;
}): string[] {
  const { rule, eventPayload } = params;

  if (rule.recipient_strategy === "fixed") {
    return rule.fixed_recipient_key ? [rule.fixed_recipient_key] : [];
  }

  if (rule.recipient_strategy === "broadcast") {
    const recipients = eventPayload.recipientKeys;
    return Array.isArray(recipients) ? recipients.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
  }

  const primaryRecipient = eventPayload.recipientKey;
  if (typeof primaryRecipient === "string" && primaryRecipient.length > 0) {
    return [primaryRecipient];
  }

  const recipients = eventPayload.recipientKeys;
  return Array.isArray(recipients) ? recipients.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

export async function consumeEventForNotifications(payload: { eventId: string; dryRun: boolean; metadata: Record<string, unknown> }): Promise<ConsumeEventResult> {
  const supabase = createSupabaseAdminClient();

  const { data: eventRecord, error: eventError } = await supabase
    .from("pgems_events")
    .select("id, event_type_id, category_id, payload, metadata")
    .eq("id", payload.eventId)
    .single();

  if (eventError) throw eventError;

  const { data: rules, error: rulesError } = await supabase
    .from("pgems_notification_rules")
    .select("*")
    .eq("is_active", true);

  if (rulesError) throw rulesError;

  const matchedRules = (rules ?? []).filter((rule) => {
    const typeMatches = !rule.event_type_id || rule.event_type_id === eventRecord.event_type_id;
    const categoryMatches = !rule.event_category_id || rule.event_category_id === eventRecord.category_id;
    return typeMatches && categoryMatches;
  }) as NotificationRuleRecord[];

  let createdNotificationCount = 0;
  let skippedByPreferenceCount = 0;

  if (!payload.dryRun) {
    for (const rule of matchedRules) {
      const { data: template, error: templateError } = await supabase
        .from("pgems_notification_templates")
        .select("*")
        .eq("id", rule.template_id)
        .single();
      if (templateError) throw templateError;

      const recipients = resolveRecipientsFromRule({
        rule,
        eventPayload: (eventRecord.payload ?? {}) as Record<string, unknown>,
      });

      for (const recipientKey of recipients) {
        const { data: preference } = await supabase
          .from("pgems_notification_preferences")
          .select("*")
          .eq("recipient_key", recipientKey)
          .eq("channel_id", rule.channel_id)
          .maybeSingle();

        const pref = (preference ?? null) as NotificationPreferenceRecord | null;
        if (isPreferenceMuted(pref)) {
          skippedByPreferenceCount += 1;
          continue;
        }

        const locale = resolvePreferredLocale(pref, rule.locale || template.locale || "en");
        const rendered = renderNotificationTemplate({
          titleTemplate: template.title_template,
          bodyTemplate: template.body_template,
          locale,
          context: {
            event: eventRecord,
            payload: eventRecord.payload ?? {},
            metadata: eventRecord.metadata ?? {},
            recipientKey,
          },
        });

        await createNotification({
          notificationCode: rule.code,
          recipientKey,
          channelId: rule.channel_id,
          templateId: template.id,
          sourceEventId: eventRecord.id,
          sourceEventTypeId: eventRecord.event_type_id,
          sourceEventCategoryId: eventRecord.category_id,
          locale: rendered.locale,
          title: rendered.title,
          body: rendered.body,
          payload: (eventRecord.payload ?? {}) as Record<string, unknown>,
          metadata: {
            ...(rule.metadata ?? {}),
            consumedFromEventId: eventRecord.id,
            consumeMetadata: payload.metadata,
          },
          priority: rule.default_priority,
          status: "queued",
          maxRetryCount: 5,
        });

        createdNotificationCount += 1;
      }
    }

    await appendNotificationAudit({
      actionCode: "consume_event",
      actorType: "system",
      actorKey: "notification_engine",
      outcome: "success",
      reason: "Event consumed for notification routing",
      metadata: {
        eventId: payload.eventId,
        matchedRuleCount: matchedRules.length,
        createdNotificationCount,
        skippedByPreferenceCount,
      },
    });
  }

  return {
    eventId: payload.eventId,
    matchedRuleCount: matchedRules.length,
    createdNotificationCount,
    skippedByPreferenceCount,
    dryRun: payload.dryRun,
  };
}
