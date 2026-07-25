export type EventKind = "domain" | "system" | "business";
export type EventStatus = "created" | "queued" | "processing" | "delivered" | "failed" | "cancelled" | "retried" | "archived";
export type EventPriority = "low" | "normal" | "high" | "critical" | "emergency";
export type EventTarget =
  | "workflow_engine"
  | "notification_engine"
  | "dashboard_engine"
  | "ai_engine"
  | "analytics_engine"
  | "audit_engine"
  | "email"
  | "sms"
  | "push"
  | "webhook"
  | "external_integration";

export interface EventCategoryRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventTypeRecord {
  id: string;
  category_id: string;
  code: string;
  name: string;
  kind: EventKind;
  payload_schema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventChannelRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  routing_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventPublisherRecord {
  id: string;
  code: string;
  name: string;
  publisher_type: "service" | "module" | "system";
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventSubscriberRecord {
  id: string;
  code: string;
  name: string;
  subscriber_type: "service" | "module" | "system" | "external";
  target: EventTarget;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventQueueRecord {
  id: string;
  channel_id: string;
  code: string;
  name: string;
  ordering_mode: "fifo" | "priority" | "partitioned";
  duplicate_window_seconds: number;
  metadata: Record<string, unknown>;
  dead_letter_queue_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventHandlerRecord {
  id: string;
  subscriber_id: string;
  event_type_id: string;
  channel_id: string;
  queue_id: string;
  code: string;
  retry_limit: number;
  retry_backoff_seconds: number;
  idempotent: boolean;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventSubscriptionRecord {
  id: string;
  subscriber_id: string;
  event_type_id: string | null;
  category_id: string | null;
  channel_id: string | null;
  priority_filter: EventPriority[];
  organization_id: string | null;
  branch_code: string | null;
  country_code: string | null;
  workflow_ref: string | null;
  routing_rules: Record<string, unknown>;
  is_active: boolean;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRecord {
  id: string;
  event_type_id: string;
  category_id: string;
  channel_id: string;
  publisher_id: string;
  queue_id: string;
  kind: EventKind;
  status: EventStatus;
  priority: EventPriority;
  organization_id: string | null;
  branch_code: string | null;
  country_code: string | null;
  workflow_ref: string | null;
  correlation_id: string;
  trace_id: string;
  idempotency_key: string;
  ordering_key: string | null;
  sequence_key: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  retry_count: number;
  max_retry_count: number;
  scheduled_at: string | null;
  delayed_until: string | null;
  next_retry_at: string | null;
  available_at: string;
  dead_lettered_at: string | null;
  immutable: boolean;
  created_at: string;
}

export interface EventDeliveryRecord {
  id: string;
  event_id: string;
  subscriber_id: string;
  handler_id: string | null;
  target: EventTarget;
  status: EventStatus;
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

export interface EventRetryRecord {
  id: string;
  event_id: string;
  delivery_id: string;
  retry_number: number;
  status: EventStatus;
  reason: string;
  metadata: Record<string, unknown>;
  scheduled_at: string;
  executed_at: string | null;
  created_at: string;
}

export interface EventLogRecord {
  id: string;
  event_id: string;
  delivery_id: string | null;
  log_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PublishEventInput {
  eventTypeId: string;
  categoryId: string;
  channelId: string;
  publisherId: string;
  queueId: string;
  kind: EventKind;
  priority: EventPriority;
  status: EventStatus;
  organizationId?: string;
  branchCode?: string;
  countryCode?: string;
  workflowRef?: string;
  correlationId: string;
  traceId: string;
  idempotencyKey: string;
  orderingKey?: string;
  sequenceKey?: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  scheduledAt?: string;
  delayedUntil?: string;
  maxRetryCount: number;
}

export interface EventBusPublishResult {
  accepted: boolean;
  eventId: string;
  status: EventStatus;
  deduplicated: boolean;
  reason: string;
}

export interface EventBusSubscribeResult {
  subscriptionId: string;
  active: boolean;
}

export interface EventBusUnsubscribeResult {
  subscriptionId: string;
  active: boolean;
  reason: string;
}

export interface EventRetryResult {
  eventId: string;
  retryCount: number;
  status: EventStatus;
  nextRetryAt: string;
}

export interface EventReplayResult {
  sourceEventId: string;
  replayedEventId: string;
  status: EventStatus;
}

export interface EventLifecycleTransitionResult {
  allowed: boolean;
  from: EventStatus;
  to: EventStatus;
  reason: string;
}

export interface EventRoutingContext {
  eventTypeId?: string | null;
  categoryId?: string | null;
  priority?: EventPriority | null;
  publisherId?: string | null;
  organizationId?: string | null;
  branchCode?: string | null;
  countryCode?: string | null;
  workflowRef?: string | null;
}

export interface EventRoutingResult {
  matched: boolean;
  reason: string;
}

export interface EventDuplicateCheck {
  duplicate: boolean;
  reason: string;
}
