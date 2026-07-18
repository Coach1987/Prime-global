export type NotificationChannelKind = "in_app" | "email" | "sms" | "push" | "webhook" | "future";
export type NotificationPriority = "low" | "normal" | "high" | "critical" | "emergency";
export type NotificationStatus = "created" | "queued" | "processing" | "sent" | "delivered" | "failed" | "cancelled" | "read" | "unread" | "archived" | "deleted";

export interface NotificationChannelRecord {
  id: string;
  code: string;
  name: string;
  channel_kind: NotificationChannelKind;
  description: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplateRecord {
  id: string;
  code: string;
  name: string;
  channel_id: string;
  locale: string;
  title_template: string;
  body_template: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRuleRecord {
  id: string;
  code: string;
  name: string;
  event_type_id: string | null;
  event_category_id: string | null;
  channel_id: string;
  template_id: string;
  default_priority: NotificationPriority;
  recipient_strategy: "event_metadata" | "fixed" | "broadcast";
  fixed_recipient_key: string | null;
  locale: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferenceRecord {
  id: string;
  recipient_key: string;
  channel_id: string;
  rule_code: string | null;
  locale: string;
  mute_until: string | null;
  quiet_hours: Record<string, unknown>;
  enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueueRecord {
  id: string;
  channel_id: string;
  code: string;
  name: string;
  ordering_mode: "fifo" | "priority" | "partitioned";
  duplicate_window_seconds: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  notification_code: string;
  recipient_key: string;
  channel_id: string;
  template_id: string | null;
  queue_id: string | null;
  source_event_id: string | null;
  source_event_type_id: string | null;
  source_event_category_id: string | null;
  locale: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  priority: NotificationPriority;
  status: NotificationStatus;
  read_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  delete_reason: string | null;
  retry_count: number;
  max_retry_count: number;
  scheduled_at: string | null;
  available_at: string;
  immutable: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryRecord {
  id: string;
  notification_id: string;
  channel_id: string;
  target_address: string;
  status: NotificationStatus;
  attempts: number;
  response_metadata: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRetryRecord {
  id: string;
  notification_id: string;
  delivery_id: string | null;
  retry_number: number;
  status: NotificationStatus;
  reason: string;
  metadata: Record<string, unknown>;
  scheduled_at: string;
  executed_at: string | null;
  created_at: string;
}

export interface NotificationHistoryRecord {
  id: string;
  notification_id: string;
  entry_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationAuditRecord {
  id: string;
  notification_id: string | null;
  action_code: string;
  actor_type: "user" | "system" | "service";
  actor_key: string;
  outcome: "success" | "failure" | "manual_review";
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConsumeEventResult {
  eventId: string;
  matchedRuleCount: number;
  createdNotificationCount: number;
  skippedByPreferenceCount: number;
  dryRun: boolean;
}

export interface NotificationTransitionResult {
  allowed: boolean;
  from: NotificationStatus;
  to: NotificationStatus;
  reason: string;
}

export interface NotificationRenderResult {
  title: string;
  body: string;
  locale: string;
}
