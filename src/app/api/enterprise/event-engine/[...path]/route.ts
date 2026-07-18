import { NextResponse } from "next/server";
import {
  createEventCategorySchema,
  createEventChannelSchema,
  createEventDeliverySchema,
  createEventHandlerSchema,
  createEventPublisherSchema,
  createEventQueueSchema,
  createEventSubscriberSchema,
  createEventSubscriptionSchema,
  createEventTypeSchema,
  listEventsQuerySchema,
  publishEventSchema,
  replayEventSchema,
  retryEventSchema,
  unsubscribeSchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  appendEventLog,
  createEventCategory,
  createEventChannel,
  createEventDelivery,
  createEventHandler,
  createEventPublisher,
  createEventQueue,
  createEventSubscriber,
  createEventType,
  getMatchingSubscriptionsForEvent,
  listDeadLetterEvents,
  listEventCategories,
  listEventChannels,
  listEventDeliveries,
  listEventHandlers,
  listEventLogs,
  listEventPublishers,
  listEventQueues,
  listEventRetries,
  listEventSubscribers,
  listEvents,
  listEventSubscriptions,
  listEventTypes,
  publishEvent,
  replayEvent,
  retryEvent,
  subscribeToEvents,
  unsubscribeFromEvents,
} from "../../../../../lib/server/enterprise/event-engine/index";
import { requireEventEngineAccess } from "../_shared.ts";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function ensureAccess(request: Request) {
  const auth = await requireEventEngineAccess(request);
  if (auth instanceof NextResponse) return auth;
  return null;
}

async function handleCategories(request: Request) {
  if (request.method === "GET") {
    const data = await listEventCategories();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventCategorySchema);
    if (parsed.error) return parsed.error;
    const data = await createEventCategory({
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTypes(request: Request) {
  if (request.method === "GET") {
    const data = await listEventTypes();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventTypeSchema);
    if (parsed.error) return parsed.error;
    const data = await createEventType({
      categoryId: parsed.data.categoryId,
      code: parsed.data.code,
      name: parsed.data.name,
      kind: parsed.data.kind,
      payloadSchema: parsed.data.payloadSchema ?? {},
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleChannels(request: Request) {
  if (request.method === "GET") {
    const data = await listEventChannels();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventChannelSchema);
    if (parsed.error) return parsed.error;
    const data = await createEventChannel({
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      routingConfig: parsed.data.routingConfig ?? {},
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePublishers(request: Request) {
  if (request.method === "GET") {
    const data = await listEventPublishers();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventPublisherSchema);
    if (parsed.error) return parsed.error;
    const data = await createEventPublisher({
      code: parsed.data.code,
      name: parsed.data.name,
      publisherType: parsed.data.publisherType,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSubscribers(request: Request) {
  if (request.method === "GET") {
    const data = await listEventSubscribers();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventSubscriberSchema);
    if (parsed.error) return parsed.error;
    const data = await createEventSubscriber({
      code: parsed.data.code,
      name: parsed.data.name,
      subscriberType: parsed.data.subscriberType,
      target: parsed.data.target,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleQueues(request: Request) {
  if (request.method === "GET") {
    const data = await listEventQueues();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventQueueSchema);
    if (parsed.error) return parsed.error;
    const data = await createEventQueue({
      channelId: parsed.data.channelId,
      code: parsed.data.code,
      name: parsed.data.name,
      orderingMode: parsed.data.orderingMode ?? "fifo",
      duplicateWindowSeconds: parsed.data.duplicateWindowSeconds ?? 300,
      metadata: parsed.data.metadata ?? {},
      deadLetterQueueId: parsed.data.deadLetterQueueId,
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleHandlers(request: Request) {
  if (request.method === "GET") {
    const data = await listEventHandlers();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventHandlerSchema);
    if (parsed.error) return parsed.error;
    const data = await createEventHandler({
      subscriberId: parsed.data.subscriberId,
      eventTypeId: parsed.data.eventTypeId,
      channelId: parsed.data.channelId,
      queueId: parsed.data.queueId,
      code: parsed.data.code,
      retryLimit: parsed.data.retryLimit ?? 5,
      retryBackoffSeconds: parsed.data.retryBackoffSeconds ?? 30,
      idempotent: parsed.data.idempotent ?? true,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSubscriptions(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      const data = await listEventSubscriptions();
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createEventSubscriptionSchema);
      if (parsed.error) return parsed.error;
      const data = await subscribeToEvents({
        subscriberId: parsed.data.subscriberId,
        eventTypeId: parsed.data.eventTypeId,
        categoryId: parsed.data.categoryId,
        channelId: parsed.data.channelId,
        priorityFilter: parsed.data.priorityFilter ?? [],
        organizationId: parsed.data.organizationId,
        branchCode: parsed.data.branchCode,
        countryCode: parsed.data.countryCode,
        workflowRef: parsed.data.workflowRef,
        routingRules: parsed.data.routingRules ?? {},
        isActive: parsed.data.isActive ?? true,
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 3 && segments[2] === "unsubscribe" && request.method === "POST") {
    const parsed = await parseJsonBody(request, unsubscribeSchema);
    if (parsed.error) return parsed.error;
    const data = await unsubscribeFromEvents(segments[1], parsed.data.reason ?? "manual_unsubscribe");
    return NextResponse.json({ success: true, data });
  }

  return jsonError("EVENT_ENGINE_NOT_FOUND", "Subscription endpoint not found", 404);
}

async function handleEvents(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const parsedQuery = listEventsQuerySchema.safeParse({
        status: url.searchParams.get("status") ?? undefined,
        priority: url.searchParams.get("priority") ?? undefined,
        categoryId: url.searchParams.get("categoryId") ?? undefined,
        eventTypeId: url.searchParams.get("eventTypeId") ?? undefined,
        organizationId: url.searchParams.get("organizationId") ?? undefined,
        branchCode: url.searchParams.get("branchCode") ?? undefined,
        countryCode: url.searchParams.get("countryCode") ?? undefined,
        workflowRef: url.searchParams.get("workflowRef") ?? undefined,
      });
      if (!parsedQuery.success) {
        return jsonError("INVALID_QUERY", "Invalid events query", 400);
      }

      const data = await listEvents(parsedQuery.data);
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, publishEventSchema);
      if (parsed.error) return parsed.error;
      const published = await publishEvent({
        eventTypeId: parsed.data.eventTypeId,
        categoryId: parsed.data.categoryId,
        channelId: parsed.data.channelId,
        publisherId: parsed.data.publisherId,
        queueId: parsed.data.queueId,
        kind: parsed.data.kind,
        priority: parsed.data.priority ?? "normal",
        status: parsed.data.status ?? "created",
        organizationId: parsed.data.organizationId,
        branchCode: parsed.data.branchCode,
        countryCode: parsed.data.countryCode,
        workflowRef: parsed.data.workflowRef,
        correlationId: parsed.data.correlationId,
        traceId: parsed.data.traceId,
        idempotencyKey: parsed.data.idempotencyKey,
        orderingKey: parsed.data.orderingKey,
        sequenceKey: parsed.data.sequenceKey,
        payload: parsed.data.payload ?? {},
        metadata: parsed.data.metadata ?? {},
        scheduledAt: parsed.data.scheduledAt,
        delayedUntil: parsed.data.delayedUntil,
        maxRetryCount: parsed.data.maxRetryCount ?? 5,
      });

      const subscriptions = await getMatchingSubscriptionsForEvent(published.result.eventId);
      await appendEventLog({
        eventId: published.result.eventId,
        logType: "routing",
        message: "Matching subscriptions resolved",
        metadata: { subscriptionCount: subscriptions.length, subscriptionIds: subscriptions.map((item) => item.id) },
      });

      return NextResponse.json({ success: true, data: { ...published, subscriptions } }, { status: 201 });
    }
  }

  if (segments.length === 3 && segments[2] === "retry" && request.method === "POST") {
    const parsed = await parseJsonBody(request, retryEventSchema);
    if (parsed.error) return parsed.error;
    const data = await retryEvent(segments[1], {
      reason: parsed.data.reason,
      delaySeconds: parsed.data.delaySeconds ?? 0,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data });
  }

  if (segments.length === 3 && segments[2] === "replay" && request.method === "POST") {
    const parsed = await parseJsonBody(request, replayEventSchema);
    if (parsed.error) return parsed.error;
    const data = await replayEvent(segments[1], {
      subscriberIds: parsed.data.subscriberIds ?? [],
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data });
  }

  return jsonError("EVENT_ENGINE_NOT_FOUND", "Event endpoint not found", 404);
}

async function handleDeliveries(request: Request) {
  if (request.method === "GET") {
    const data = await listEventDeliveries();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEventDeliverySchema);
    if (parsed.error) return parsed.error;
    const data = await createEventDelivery({
      eventId: parsed.data.eventId,
      subscriberId: parsed.data.subscriberId,
      handlerId: parsed.data.handlerId,
      target: parsed.data.target,
      status: parsed.data.status ?? "queued",
      responseMetadata: parsed.data.responseMetadata ?? {},
      errorCode: parsed.data.errorCode,
      errorMessage: parsed.data.errorMessage,
      nextRetryAt: parsed.data.nextRetryAt,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleRetries(request: Request) {
  if (request.method !== "GET") {
    return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const data = await listEventRetries();
  return NextResponse.json({ success: true, data });
}

async function handleDeadLetter(request: Request) {
  if (request.method !== "GET") {
    return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const data = await listDeadLetterEvents();
  return NextResponse.json({ success: true, data });
}

async function handleLogs(request: Request) {
  if (request.method !== "GET") {
    return jsonError("EVENT_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const data = await listEventLogs();
  return NextResponse.json({ success: true, data });
}

async function dispatch(request: Request, segments: string[]) {
  const root = segments[0];

  if (root === "event-categories") return handleCategories(request);
  if (root === "event-types") return handleTypes(request);
  if (root === "event-channels") return handleChannels(request);
  if (root === "event-publishers") return handlePublishers(request);
  if (root === "event-subscribers") return handleSubscribers(request);
  if (root === "event-queues") return handleQueues(request);
  if (root === "event-handlers") return handleHandlers(request);
  if (root === "event-subscriptions") return handleSubscriptions(request, segments);
  if (root === "events") return handleEvents(request, segments);
  if (root === "event-deliveries") return handleDeliveries(request);
  if (root === "event-retries") return handleRetries(request);
  if (root === "event-dead-letter") return handleDeadLetter(request);
  if (root === "event-logs") return handleLogs(request);

  return jsonError("EVENT_ENGINE_NOT_FOUND", "Event engine endpoint not found", 404);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-event-engine-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) return jsonError("EVENT_ENGINE_NOT_FOUND", "Event engine root requires resource path", 404);

  return dispatch(request, segments);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-event-engine-post", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) return jsonError("EVENT_ENGINE_NOT_FOUND", "Event engine root requires resource path", 404);

  return dispatch(request, segments);
}
