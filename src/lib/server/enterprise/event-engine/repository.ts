import { createSupabaseAdminClient } from "../../supabase.ts";
import { checkEventDuplicate, createPublishResult, createReplayResult, createRetryResult, createSubscribeResult, createUnsubscribeResult, validateEventStatusTransition } from "./bus.ts";
import { doesSubscriptionMatchEvent } from "./routing.ts";
import type {
  EventCategoryRecord,
  EventChannelRecord,
  EventDeliveryRecord,
  EventHandlerRecord,
  EventLogRecord,
  EventPublisherRecord,
  EventRecord,
  EventReplayResult,
  EventRetryRecord,
  EventRetryResult,
  EventSubscriberRecord,
  EventSubscriptionRecord,
  EventTypeRecord,
  EventQueueRecord,
  PublishEventInput,
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

export async function listEventCategories() {
  return listRows<EventCategoryRecord>("pgems_event_categories");
}

export async function createEventCategory(payload: { code: string; name: string; description?: string | null; isActive: boolean }) {
  return createRow<EventCategoryRecord>("pgems_event_categories", {
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    is_active: payload.isActive,
  });
}

export async function listEventTypes() {
  return listRows<EventTypeRecord>("pgems_event_types");
}

export async function createEventType(payload: {
  categoryId: string;
  code: string;
  name: string;
  kind: "domain" | "system" | "business";
  payloadSchema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<EventTypeRecord>("pgems_event_types", {
    category_id: payload.categoryId,
    code: payload.code,
    name: payload.name,
    kind: payload.kind,
    payload_schema: payload.payloadSchema,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listEventChannels() {
  return listRows<EventChannelRecord>("pgems_event_channels");
}

export async function createEventChannel(payload: { code: string; name: string; description?: string | null; routingConfig: Record<string, unknown>; isActive: boolean }) {
  return createRow<EventChannelRecord>("pgems_event_channels", {
    code: payload.code,
    name: payload.name,
    description: payload.description ?? null,
    routing_config: payload.routingConfig,
    is_active: payload.isActive,
  });
}

export async function listEventPublishers() {
  return listRows<EventPublisherRecord>("pgems_event_publishers");
}

export async function createEventPublisher(payload: { code: string; name: string; publisherType: "service" | "module" | "system"; metadata: Record<string, unknown>; isActive: boolean }) {
  return createRow<EventPublisherRecord>("pgems_event_publishers", {
    code: payload.code,
    name: payload.name,
    publisher_type: payload.publisherType,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listEventSubscribers() {
  return listRows<EventSubscriberRecord>("pgems_event_subscribers");
}

export async function createEventSubscriber(payload: {
  code: string;
  name: string;
  subscriberType: "service" | "module" | "system" | "external";
  target: EventSubscriberRecord["target"];
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<EventSubscriberRecord>("pgems_event_subscribers", {
    code: payload.code,
    name: payload.name,
    subscriber_type: payload.subscriberType,
    target: payload.target,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listEventQueues() {
  return listRows<EventQueueRecord>("pgems_event_queues");
}

export async function createEventQueue(payload: {
  channelId: string;
  code: string;
  name: string;
  orderingMode: "fifo" | "priority" | "partitioned";
  duplicateWindowSeconds: number;
  metadata: Record<string, unknown>;
  deadLetterQueueId?: string;
  isActive: boolean;
}) {
  return createRow<EventQueueRecord>("pgems_event_queues", {
    channel_id: payload.channelId,
    code: payload.code,
    name: payload.name,
    ordering_mode: payload.orderingMode,
    duplicate_window_seconds: payload.duplicateWindowSeconds,
    metadata: payload.metadata,
    dead_letter_queue_id: payload.deadLetterQueueId ?? null,
    is_active: payload.isActive,
  });
}

export async function listEventHandlers() {
  return listRows<EventHandlerRecord>("pgems_event_handlers");
}

export async function createEventHandler(payload: {
  subscriberId: string;
  eventTypeId: string;
  channelId: string;
  queueId: string;
  code: string;
  retryLimit: number;
  retryBackoffSeconds: number;
  idempotent: boolean;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<EventHandlerRecord>("pgems_event_handlers", {
    subscriber_id: payload.subscriberId,
    event_type_id: payload.eventTypeId,
    channel_id: payload.channelId,
    queue_id: payload.queueId,
    code: payload.code,
    retry_limit: payload.retryLimit,
    retry_backoff_seconds: payload.retryBackoffSeconds,
    idempotent: payload.idempotent,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listEventSubscriptions() {
  return listRows<EventSubscriptionRecord>("pgems_event_subscriptions");
}

export async function subscribeToEvents(payload: {
  subscriberId: string;
  eventTypeId?: string;
  categoryId?: string;
  channelId?: string;
  priorityFilter: EventSubscriptionRecord["priority_filter"];
  organizationId?: string;
  branchCode?: string;
  countryCode?: string;
  workflowRef?: string;
  routingRules: Record<string, unknown>;
  isActive: boolean;
}) {
  const subscription = await createRow<EventSubscriptionRecord>("pgems_event_subscriptions", {
    subscriber_id: payload.subscriberId,
    event_type_id: payload.eventTypeId ?? null,
    category_id: payload.categoryId ?? null,
    channel_id: payload.channelId ?? null,
    priority_filter: payload.priorityFilter,
    organization_id: payload.organizationId ?? null,
    branch_code: payload.branchCode ?? null,
    country_code: payload.countryCode ?? null,
    workflow_ref: payload.workflowRef ?? null,
    routing_rules: payload.routingRules,
    is_active: payload.isActive,
  });

  return {
    data: subscription,
    result: createSubscribeResult(subscription.id),
  };
}

export async function unsubscribeFromEvents(subscriptionId: string, reason: string) {
  const subscription = await updateRow<EventSubscriptionRecord>(
    "pgems_event_subscriptions",
    { id: subscriptionId },
    {
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: reason,
    }
  );

  return {
    data: subscription,
    result: createUnsubscribeResult(subscription.id, reason),
  };
}

export async function listEvents(filters?: Partial<{ status: EventRecord["status"]; priority: EventRecord["priority"]; categoryId: string; eventTypeId: string; organizationId: string; branchCode: string; countryCode: string; workflowRef: string }>) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("pgems_events").select("*").order("created_at", { ascending: true });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.eventTypeId) query = query.eq("event_type_id", filters.eventTypeId);
  if (filters?.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters?.branchCode) query = query.eq("branch_code", filters.branchCode);
  if (filters?.countryCode) query = query.eq("country_code", filters.countryCode);
  if (filters?.workflowRef) query = query.eq("workflow_ref", filters.workflowRef);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EventRecord[];
}

export async function publishEvent(payload: PublishEventInput) {
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("pgems_events")
    .select("id, idempotency_key, status")
    .eq("idempotency_key", payload.idempotencyKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const duplicateCheck = checkEventDuplicate({
    existingEventIdempotencyKey: existing?.idempotency_key ?? null,
    incomingIdempotencyKey: payload.idempotencyKey,
  });

  if (duplicateCheck.duplicate && existing?.id) {
    return {
      data: existing,
      result: createPublishResult({ eventId: existing.id, deduplicated: true, status: existing.status ?? "queued" }),
    };
  }

  const availableAt = payload.delayedUntil ?? payload.scheduledAt ?? new Date().toISOString();

  const event = await createRow<EventRecord>("pgems_events", {
    event_type_id: payload.eventTypeId,
    category_id: payload.categoryId,
    channel_id: payload.channelId,
    publisher_id: payload.publisherId,
    queue_id: payload.queueId,
    kind: payload.kind,
    status: payload.status,
    priority: payload.priority,
    organization_id: payload.organizationId ?? null,
    branch_code: payload.branchCode ?? null,
    country_code: payload.countryCode ?? null,
    workflow_ref: payload.workflowRef ?? null,
    correlation_id: payload.correlationId,
    trace_id: payload.traceId,
    idempotency_key: payload.idempotencyKey,
    ordering_key: payload.orderingKey ?? null,
    sequence_key: payload.sequenceKey ?? null,
    payload: payload.payload,
    metadata: payload.metadata,
    retry_count: 0,
    max_retry_count: payload.maxRetryCount,
    scheduled_at: payload.scheduledAt ?? null,
    delayed_until: payload.delayedUntil ?? null,
    next_retry_at: null,
    available_at: availableAt,
  });

  await appendEventLog({
    eventId: event.id,
    logType: "publish",
    message: "Event published",
    metadata: { status: event.status, priority: event.priority },
  });

  return {
    data: event,
    result: createPublishResult({ eventId: event.id, deduplicated: false, status: event.status }),
  };
}

export async function listEventDeliveries() {
  return listRows<EventDeliveryRecord>("pgems_event_deliveries");
}

export async function createEventDelivery(payload: {
  eventId: string;
  subscriberId: string;
  handlerId?: string;
  target: EventDeliveryRecord["target"];
  status: EventDeliveryRecord["status"];
  responseMetadata: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  nextRetryAt?: string;
}) {
  return createRow<EventDeliveryRecord>("pgems_event_deliveries", {
    event_id: payload.eventId,
    subscriber_id: payload.subscriberId,
    handler_id: payload.handlerId ?? null,
    target: payload.target,
    status: payload.status,
    attempts: 0,
    response_metadata: payload.responseMetadata,
    error_code: payload.errorCode ?? null,
    error_message: payload.errorMessage ?? null,
    next_retry_at: payload.nextRetryAt ?? null,
  });
}

export async function listEventRetries() {
  return listRows<EventRetryRecord>("pgems_event_retries");
}

export async function retryEvent(eventId: string, payload: { reason: string; delaySeconds: number; metadata: Record<string, unknown> }) {
  const supabase = createSupabaseAdminClient();

  const { data: event, error: eventError } = await supabase
    .from("pgems_events")
    .select("id, status, retry_count, max_retry_count")
    .eq("id", eventId)
    .single();

  if (eventError) throw eventError;

  const fromStatus = event.status as EventRecord["status"];
  const transition = validateEventStatusTransition(fromStatus, "retried");
  if (!transition.allowed) {
    throw new Error(transition.reason);
  }

  const nextRetryCount = Number(event.retry_count ?? 0) + 1;
  const maxRetryCount = Number(event.max_retry_count ?? 0);
  if (nextRetryCount > maxRetryCount) {
    await deadLetterEvent(eventId, "retry_limit_exceeded", payload.metadata);
    throw new Error("retry_limit_exceeded");
  }

  const nextRetryAt = new Date(Date.now() + payload.delaySeconds * 1000).toISOString();

  const updated = await updateRow<EventRecord>(
    "pgems_events",
    { id: eventId },
    {
      status: "retried",
      retry_count: nextRetryCount,
      next_retry_at: nextRetryAt,
      available_at: nextRetryAt,
    }
  );

  const retry = await createRow<EventRetryRecord>("pgems_event_retries", {
    event_id: eventId,
    delivery_id: null,
    retry_number: nextRetryCount,
    status: "retried",
    reason: payload.reason,
    metadata: payload.metadata,
    scheduled_at: nextRetryAt,
    executed_at: null,
  });

  await appendEventLog({
    eventId,
    logType: "retry",
    message: "Event retry scheduled",
    metadata: { retryId: retry.id, nextRetryAt, retryCount: nextRetryCount },
  });

  const result: EventRetryResult = createRetryResult({
    eventId: updated.id,
    retryCount: nextRetryCount,
    nextRetryAt,
  });

  return { data: updated, retry, result };
}

export async function replayEvent(eventId: string, payload: { subscriberIds: string[]; metadata: Record<string, unknown> }) {
  const supabase = createSupabaseAdminClient();

  const { data: original, error } = await supabase.from("pgems_events").select("*").eq("id", eventId).single();
  if (error) throw error;

  const replayed = await createRow<EventRecord>("pgems_events", {
    event_type_id: original.event_type_id,
    category_id: original.category_id,
    channel_id: original.channel_id,
    publisher_id: original.publisher_id,
    queue_id: original.queue_id,
    kind: original.kind,
    status: "queued",
    priority: original.priority,
    organization_id: original.organization_id,
    branch_code: original.branch_code,
    country_code: original.country_code,
    workflow_ref: original.workflow_ref,
    correlation_id: original.correlation_id,
    trace_id: original.trace_id,
    idempotency_key: `${original.idempotency_key}:replay:${Date.now()}`,
    ordering_key: original.ordering_key,
    sequence_key: original.sequence_key,
    payload: original.payload,
    metadata: {
      ...(original.metadata ?? {}),
      replayOfEventId: eventId,
      replaySubscriberIds: payload.subscriberIds,
      replayMetadata: payload.metadata,
    },
    retry_count: 0,
    max_retry_count: original.max_retry_count,
    scheduled_at: null,
    delayed_until: null,
    next_retry_at: null,
    available_at: new Date().toISOString(),
  });

  await appendEventLog({
    eventId: replayed.id,
    logType: "replay",
    message: "Event replayed",
    metadata: { sourceEventId: eventId },
  });

  const result: EventReplayResult = createReplayResult({
    sourceEventId: eventId,
    replayedEventId: replayed.id,
  });

  return { data: replayed, result };
}

export async function deadLetterEvent(eventId: string, reason: string, metadata: Record<string, unknown>) {
  const updated = await updateRow<EventRecord>("pgems_events", { id: eventId }, {
    status: "failed",
    dead_lettered_at: new Date().toISOString(),
  });

  await appendEventLog({
    eventId,
    logType: "dead_letter",
    message: reason,
    metadata,
  });

  return updated;
}

export async function listDeadLetterEvents() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_events")
    .select("*")
    .eq("status", "failed")
    .not("dead_lettered_at", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRecord[];
}

export async function listEventLogs() {
  return listRows<EventLogRecord>("pgems_event_logs");
}

export async function appendEventLog(payload: {
  eventId: string;
  deliveryId?: string;
  logType: string;
  message: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<EventLogRecord>("pgems_event_logs", {
    event_id: payload.eventId,
    delivery_id: payload.deliveryId ?? null,
    log_type: payload.logType,
    message: payload.message,
    metadata: payload.metadata,
  });
}

export async function getMatchingSubscriptionsForEvent(eventId: string) {
  const supabase = createSupabaseAdminClient();

  const [{ data: event, error: eventError }, { data: subscriptions, error: subsError }] = await Promise.all([
    supabase.from("pgems_events").select("*").eq("id", eventId).single(),
    supabase.from("pgems_event_subscriptions").select("*").eq("is_active", true),
  ]);

  if (eventError) throw eventError;
  if (subsError) throw subsError;

  return (subscriptions ?? []).filter((subscription) =>
    doesSubscriptionMatchEvent(subscription as EventSubscriptionRecord, {
      eventTypeId: event.event_type_id,
      categoryId: event.category_id,
      priority: event.priority,
      publisherId: event.publisher_id,
      organizationId: event.organization_id,
      branchCode: event.branch_code,
      countryCode: event.country_code,
      workflowRef: event.workflow_ref,
    }).matched
  ) as EventSubscriptionRecord[];
}
