import { NextResponse } from "next/server";
import {
  archiveNotificationSchema,
  consumeEventSchema,
  createBulkNotificationSchema,
  createNotificationAuditSchema,
  createNotificationChannelSchema,
  createNotificationDeliverySchema,
  createNotificationHistorySchema,
  createNotificationPreferenceSchema,
  createNotificationQueueSchema,
  createNotificationRetrySchema,
  createNotificationRuleSchema,
  createNotificationSchema,
  createNotificationTemplateSchema,
  listNotificationsQuerySchema,
  markNotificationReadSchema,
  softDeleteNotificationSchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  appendNotificationAudit,
  appendNotificationHistory,
  archiveNotification,
  consumeEventForNotifications,
  createBulkNotifications,
  createNotification,
  createNotificationChannel,
  createNotificationDelivery,
  createNotificationPreference,
  createNotificationQueue,
  createNotificationRule,
  createNotificationTemplate,
  listNotificationAudit,
  listNotificationChannels,
  listNotificationDeliveries,
  listNotificationHistory,
  listNotificationPreferences,
  listNotificationQueues,
  listNotificationRetries,
  listNotificationRules,
  listNotifications,
  listNotificationTemplates,
  markNotificationRead,
  retryNotification,
  softDeleteNotification,
} from "../../../../../lib/server/enterprise/notification-engine/index";
import { requireNotificationEngineAccess } from "../_shared.ts";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function ensureAccess(request: Request) {
  const auth = await requireNotificationEngineAccess(request);
  if (auth instanceof NextResponse) return auth;
  return null;
}

async function handleChannels(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationChannels();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationChannelSchema);
    if (parsed.error) return parsed.error;

    const data = await createNotificationChannel({
      code: parsed.data.code,
      name: parsed.data.name,
      channelKind: parsed.data.channelKind,
      description: parsed.data.description ?? null,
      config: parsed.data.config ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTemplates(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationTemplates();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationTemplateSchema);
    if (parsed.error) return parsed.error;

    const data = await createNotificationTemplate({
      code: parsed.data.code,
      name: parsed.data.name,
      channelId: parsed.data.channelId,
      locale: parsed.data.locale ?? "en",
      titleTemplate: parsed.data.titleTemplate,
      bodyTemplate: parsed.data.bodyTemplate,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleRules(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationRules();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationRuleSchema);
    if (parsed.error) return parsed.error;

    const data = await createNotificationRule({
      code: parsed.data.code,
      name: parsed.data.name,
      eventTypeId: parsed.data.eventTypeId,
      eventCategoryId: parsed.data.eventCategoryId,
      channelId: parsed.data.channelId,
      templateId: parsed.data.templateId,
      defaultPriority: parsed.data.defaultPriority ?? "normal",
      recipientStrategy: parsed.data.recipientStrategy ?? "event_metadata",
      fixedRecipientKey: parsed.data.fixedRecipientKey,
      locale: parsed.data.locale ?? "en",
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePreferences(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationPreferences();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationPreferenceSchema);
    if (parsed.error) return parsed.error;

    const data = await createNotificationPreference({
      recipientKey: parsed.data.recipientKey,
      channelId: parsed.data.channelId,
      ruleCode: parsed.data.ruleCode,
      locale: parsed.data.locale ?? "en",
      muteUntil: parsed.data.muteUntil,
      quietHours: parsed.data.quietHours ?? {},
      enabled: parsed.data.enabled ?? true,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleQueues(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationQueues();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationQueueSchema);
    if (parsed.error) return parsed.error;

    const data = await createNotificationQueue({
      channelId: parsed.data.channelId,
      code: parsed.data.code,
      name: parsed.data.name,
      orderingMode: parsed.data.orderingMode ?? "fifo",
      duplicateWindowSeconds: parsed.data.duplicateWindowSeconds ?? 300,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleNotifications(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const parsedQuery = listNotificationsQuerySchema.safeParse({
        recipientKey: url.searchParams.get("recipientKey") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        priority: url.searchParams.get("priority") ?? undefined,
        channelId: url.searchParams.get("channelId") ?? undefined,
        sourceEventId: url.searchParams.get("sourceEventId") ?? undefined,
        includeDeleted: url.searchParams.get("includeDeleted") === "true",
        includeArchived: url.searchParams.get("includeArchived") === "true",
      });

      if (!parsedQuery.success) {
        return jsonError("INVALID_QUERY", "Invalid notifications query", 400);
      }

      const data = await listNotifications(parsedQuery.data);
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createNotificationSchema);
      if (parsed.error) return parsed.error;

      const data = await createNotification({
        notificationCode: parsed.data.notificationCode,
        recipientKey: parsed.data.recipientKey,
        channelId: parsed.data.channelId,
        templateId: parsed.data.templateId,
        queueId: parsed.data.queueId,
        sourceEventId: parsed.data.sourceEventId,
        sourceEventTypeId: parsed.data.sourceEventTypeId,
        sourceEventCategoryId: parsed.data.sourceEventCategoryId,
        locale: parsed.data.locale ?? "en",
        title: parsed.data.title,
        body: parsed.data.body,
        payload: parsed.data.payload ?? {},
        metadata: parsed.data.metadata ?? {},
        priority: parsed.data.priority ?? "normal",
        status: parsed.data.status ?? "created",
        scheduledAt: parsed.data.scheduledAt,
        availableAt: parsed.data.availableAt,
        maxRetryCount: parsed.data.maxRetryCount ?? 5,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 2 && segments[1] === "bulk" && request.method === "POST") {
    const parsed = await parseJsonBody(request, createBulkNotificationSchema);
    if (parsed.error) return parsed.error;

    const data = await createBulkNotifications({
      notificationCode: parsed.data.notificationCode,
      recipientKeys: parsed.data.recipientKeys,
      channelId: parsed.data.channelId,
      templateId: parsed.data.templateId,
      queueId: parsed.data.queueId,
      sourceEventId: parsed.data.sourceEventId,
      locale: parsed.data.locale ?? "en",
      title: parsed.data.title,
      body: parsed.data.body,
      payload: parsed.data.payload ?? {},
      metadata: parsed.data.metadata ?? {},
      priority: parsed.data.priority ?? "normal",
      status: parsed.data.status ?? "created",
      scheduledAt: parsed.data.scheduledAt,
      availableAt: parsed.data.availableAt,
      maxRetryCount: parsed.data.maxRetryCount ?? 5,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (segments.length === 3 && segments[2] === "read" && request.method === "POST") {
    const parsed = await parseJsonBody(request, markNotificationReadSchema);
    if (parsed.error) return parsed.error;

    const data = await markNotificationRead(segments[1], parsed.data.read ?? true);
    return NextResponse.json({ success: true, data });
  }

  if (segments.length === 3 && segments[2] === "archive" && request.method === "POST") {
    const parsed = await parseJsonBody(request, archiveNotificationSchema);
    if (parsed.error) return parsed.error;

    const data = await archiveNotification(segments[1], parsed.data.archived ?? true);
    return NextResponse.json({ success: true, data });
  }

  if (segments.length === 3 && segments[2] === "soft-delete" && request.method === "POST") {
    const parsed = await parseJsonBody(request, softDeleteNotificationSchema);
    if (parsed.error) return parsed.error;

    const data = await softDeleteNotification(segments[1], parsed.data.reason ?? "soft_delete_requested");
    return NextResponse.json({ success: true, data });
  }

  return jsonError("NOTIFICATION_ENGINE_NOT_FOUND", "Notification endpoint not found", 404);
}

async function handleDeliveries(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationDeliveries();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationDeliverySchema);
    if (parsed.error) return parsed.error;

    const data = await createNotificationDelivery({
      notificationId: parsed.data.notificationId,
      channelId: parsed.data.channelId,
      targetAddress: parsed.data.targetAddress,
      status: parsed.data.status ?? "queued",
      responseMetadata: parsed.data.responseMetadata ?? {},
      errorCode: parsed.data.errorCode,
      errorMessage: parsed.data.errorMessage,
      nextRetryAt: parsed.data.nextRetryAt,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleRetries(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationRetries();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationRetrySchema);
    if (parsed.error) return parsed.error;

    const data = await retryNotification({
      notificationId: parsed.data.notificationId,
      deliveryId: parsed.data.deliveryId,
      reason: parsed.data.reason,
      delaySeconds: parsed.data.delaySeconds ?? 0,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleHistory(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationHistory();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationHistorySchema);
    if (parsed.error) return parsed.error;

    const data = await appendNotificationHistory({
      notificationId: parsed.data.notificationId,
      entryType: parsed.data.entryType,
      message: parsed.data.message,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleAudit(request: Request) {
  if (request.method === "GET") {
    const data = await listNotificationAudit();
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createNotificationAuditSchema);
    if (parsed.error) return parsed.error;

    const data = await appendNotificationAudit({
      notificationId: parsed.data.notificationId,
      actionCode: parsed.data.actionCode,
      actorType: parsed.data.actorType ?? "system",
      actorKey: parsed.data.actorKey,
      outcome: parsed.data.outcome ?? "success",
      reason: parsed.data.reason,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleEventConsumption(request: Request) {
  if (request.method !== "POST") {
    return jsonError("NOTIFICATION_ENGINE_METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const parsed = await parseJsonBody(request, consumeEventSchema);
  if (parsed.error) return parsed.error;

  const data = await consumeEventForNotifications({
    eventId: parsed.data.eventId,
    dryRun: parsed.data.dryRun ?? false,
    metadata: parsed.data.metadata ?? {},
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}

async function dispatch(request: Request, segments: string[]) {
  const root = segments[0];

  if (root === "notification-channels") return handleChannels(request);
  if (root === "notification-templates") return handleTemplates(request);
  if (root === "notification-rules") return handleRules(request);
  if (root === "notification-preferences") return handlePreferences(request);
  if (root === "notification-queues") return handleQueues(request);
  if (root === "notifications") return handleNotifications(request, segments);
  if (root === "notification-deliveries") return handleDeliveries(request);
  if (root === "notification-retries") return handleRetries(request);
  if (root === "notification-history") return handleHistory(request);
  if (root === "notification-audit") return handleAudit(request);
  if (root === "consume-event") return handleEventConsumption(request);

  return jsonError("NOTIFICATION_ENGINE_NOT_FOUND", "Notification engine endpoint not found", 404);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-notification-engine-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return jsonError("NOTIFICATION_ENGINE_NOT_FOUND", "Notification engine root requires resource path", 404);
  }

  return dispatch(request, segments);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-notification-engine-post", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return jsonError("NOTIFICATION_ENGINE_NOT_FOUND", "Notification engine root requires resource path", 404);
  }

  return dispatch(request, segments);
}
