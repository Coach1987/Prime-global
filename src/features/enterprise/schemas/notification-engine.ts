import { z } from "zod";

const nameSchema = z.string().trim().min(2).max(180);
const codeSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i);
const metadataSchema = z.record(z.unknown()).default({});
const localeSchema = z.string().trim().min(2).max(16);

export const notificationChannelKindSchema = z.enum(["in_app", "email", "sms", "push", "webhook", "future"]);
export const notificationPrioritySchema = z.enum(["low", "normal", "high", "critical", "emergency"]);
export const notificationStatusSchema = z.enum([
  "created",
  "queued",
  "processing",
  "sent",
  "delivered",
  "failed",
  "cancelled",
  "read",
  "unread",
  "archived",
  "deleted",
]);

export const createNotificationChannelSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  channelKind: notificationChannelKindSchema,
  description: z.string().trim().max(1000).optional(),
  config: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createNotificationTemplateSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  channelId: z.string().uuid(),
  locale: localeSchema.default("en"),
  titleTemplate: z.string().trim().min(1).max(500),
  bodyTemplate: z.string().trim().min(1).max(8000),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createNotificationRuleSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  eventTypeId: z.string().uuid().optional(),
  eventCategoryId: z.string().uuid().optional(),
  channelId: z.string().uuid(),
  templateId: z.string().uuid(),
  defaultPriority: notificationPrioritySchema.default("normal"),
  recipientStrategy: z.enum(["event_metadata", "fixed", "broadcast"]).default("event_metadata"),
  fixedRecipientKey: z.string().trim().max(160).optional(),
  locale: localeSchema.default("en"),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createNotificationPreferenceSchema = z.object({
  recipientKey: z.string().trim().min(1).max(160),
  channelId: z.string().uuid(),
  ruleCode: codeSchema.optional(),
  locale: localeSchema.default("en"),
  muteUntil: z.string().datetime().optional(),
  quietHours: metadataSchema,
  enabled: z.boolean().default(true),
  metadata: metadataSchema,
});

export const createNotificationQueueSchema = z.object({
  channelId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  orderingMode: z.enum(["fifo", "priority", "partitioned"]).default("fifo"),
  duplicateWindowSeconds: z.number().int().positive().default(300),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createNotificationSchema = z.object({
  notificationCode: codeSchema,
  recipientKey: z.string().trim().min(1).max(160),
  channelId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  queueId: z.string().uuid().optional(),
  sourceEventId: z.string().uuid().optional(),
  sourceEventTypeId: z.string().uuid().optional(),
  sourceEventCategoryId: z.string().uuid().optional(),
  locale: localeSchema.default("en"),
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(8000),
  payload: metadataSchema,
  metadata: metadataSchema,
  priority: notificationPrioritySchema.default("normal"),
  status: notificationStatusSchema.default("created"),
  scheduledAt: z.string().datetime().optional(),
  availableAt: z.string().datetime().optional(),
  maxRetryCount: z.number().int().min(0).max(100).default(5),
});

export const createBulkNotificationSchema = z.object({
  notificationCode: codeSchema,
  recipientKeys: z.array(z.string().trim().min(1).max(160)).min(1),
  channelId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  queueId: z.string().uuid().optional(),
  sourceEventId: z.string().uuid().optional(),
  locale: localeSchema.default("en"),
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(8000),
  payload: metadataSchema,
  metadata: metadataSchema,
  priority: notificationPrioritySchema.default("normal"),
  status: notificationStatusSchema.default("created"),
  scheduledAt: z.string().datetime().optional(),
  availableAt: z.string().datetime().optional(),
  maxRetryCount: z.number().int().min(0).max(100).default(5),
});

export const markNotificationReadSchema = z.object({
  read: z.boolean().default(true),
});

export const archiveNotificationSchema = z.object({
  archived: z.boolean().default(true),
});

export const softDeleteNotificationSchema = z.object({
  deleted: z.boolean().default(true),
  reason: z.string().trim().min(1).max(1000).optional(),
});

export const createNotificationDeliverySchema = z.object({
  notificationId: z.string().uuid(),
  channelId: z.string().uuid(),
  targetAddress: z.string().trim().min(1).max(320),
  status: notificationStatusSchema.default("queued"),
  responseMetadata: metadataSchema,
  errorCode: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().max(2000).optional(),
  nextRetryAt: z.string().datetime().optional(),
});

export const createNotificationRetrySchema = z.object({
  notificationId: z.string().uuid(),
  deliveryId: z.string().uuid().optional(),
  reason: z.string().trim().min(1).max(1000),
  delaySeconds: z.number().int().nonnegative().default(0),
  metadata: metadataSchema,
});

export const createNotificationHistorySchema = z.object({
  notificationId: z.string().uuid(),
  entryType: codeSchema,
  message: z.string().trim().min(1).max(2000),
  metadata: metadataSchema,
});

export const createNotificationAuditSchema = z.object({
  notificationId: z.string().uuid().optional(),
  actionCode: codeSchema,
  actorType: z.enum(["user", "system", "service"]).default("system"),
  actorKey: z.string().trim().min(1).max(160),
  outcome: z.enum(["success", "failure", "manual_review"]).default("success"),
  reason: z.string().trim().max(2000).optional(),
  metadata: metadataSchema,
});

export const consumeEventSchema = z.object({
  eventId: z.string().uuid(),
  dryRun: z.boolean().default(false),
  metadata: metadataSchema,
});

export const listNotificationsQuerySchema = z.object({
  recipientKey: z.string().trim().max(160).optional(),
  status: notificationStatusSchema.optional(),
  priority: notificationPrioritySchema.optional(),
  channelId: z.string().uuid().optional(),
  sourceEventId: z.string().uuid().optional(),
  includeDeleted: z.boolean().optional(),
  includeArchived: z.boolean().optional(),
});
