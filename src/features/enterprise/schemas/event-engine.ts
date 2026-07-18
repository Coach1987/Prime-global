import { z } from "zod";

const nameSchema = z.string().trim().min(2).max(180);
const codeSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i);
const metadataSchema = z.record(z.unknown()).default({});

export const eventKindSchema = z.enum(["domain", "system", "business"]);
export const eventStatusSchema = z.enum(["created", "queued", "processing", "delivered", "failed", "cancelled", "retried", "archived"]);
export const eventPrioritySchema = z.enum(["low", "normal", "high", "critical", "emergency"]);
export const eventTargetSchema = z.enum([
  "workflow_engine",
  "notification_engine",
  "dashboard_engine",
  "ai_engine",
  "analytics_engine",
  "audit_engine",
  "email",
  "sms",
  "push",
  "webhook",
  "external_integration",
]);

export const createEventCategorySchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const createEventTypeSchema = z.object({
  categoryId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  kind: eventKindSchema,
  payloadSchema: metadataSchema,
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createEventChannelSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
  routingConfig: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createEventPublisherSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  publisherType: z.enum(["service", "module", "system"]),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createEventSubscriberSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  subscriberType: z.enum(["service", "module", "system", "external"]),
  target: eventTargetSchema,
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createEventQueueSchema = z.object({
  channelId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  orderingMode: z.enum(["fifo", "priority", "partitioned"]).default("fifo"),
  duplicateWindowSeconds: z.number().int().positive().default(300),
  metadata: metadataSchema,
  deadLetterQueueId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const createEventHandlerSchema = z.object({
  subscriberId: z.string().uuid(),
  eventTypeId: z.string().uuid(),
  channelId: z.string().uuid(),
  queueId: z.string().uuid(),
  code: codeSchema,
  retryLimit: z.number().int().min(0).max(100).default(5),
  retryBackoffSeconds: z.number().int().positive().default(30),
  idempotent: z.boolean().default(true),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createEventSubscriptionSchema = z.object({
  subscriberId: z.string().uuid(),
  eventTypeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  priorityFilter: z.array(eventPrioritySchema).default([]),
  organizationId: z.string().uuid().optional(),
  branchCode: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().max(120).optional(),
  workflowRef: z.string().trim().max(160).optional(),
  routingRules: metadataSchema,
  isActive: z.boolean().default(true),
});

export const publishEventSchema = z.object({
  eventTypeId: z.string().uuid(),
  categoryId: z.string().uuid(),
  channelId: z.string().uuid(),
  publisherId: z.string().uuid(),
  queueId: z.string().uuid(),
  kind: eventKindSchema,
  priority: eventPrioritySchema.default("normal"),
  status: eventStatusSchema.default("created"),
  organizationId: z.string().uuid().optional(),
  branchCode: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().max(120).optional(),
  workflowRef: z.string().trim().max(160).optional(),
  correlationId: z.string().trim().min(1).max(160),
  traceId: z.string().trim().min(1).max(160),
  idempotencyKey: z.string().trim().min(1).max(200),
  orderingKey: z.string().trim().max(160).optional(),
  sequenceKey: z.string().trim().max(160).optional(),
  payload: metadataSchema,
  metadata: metadataSchema,
  scheduledAt: z.string().datetime().optional(),
  delayedUntil: z.string().datetime().optional(),
  maxRetryCount: z.number().int().min(0).max(100).default(5),
});

export const retryEventSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
  delaySeconds: z.number().int().nonnegative().default(0),
  metadata: metadataSchema,
});

export const replayEventSchema = z.object({
  subscriberIds: z.array(z.string().uuid()).default([]),
  metadata: metadataSchema,
});

export const unsubscribeSchema = z.object({
  reason: z.string().trim().min(1).max(1000).optional(),
});

export const createEventDeliverySchema = z.object({
  eventId: z.string().uuid(),
  subscriberId: z.string().uuid(),
  handlerId: z.string().uuid().optional(),
  target: eventTargetSchema,
  status: eventStatusSchema.default("queued"),
  responseMetadata: metadataSchema,
  errorCode: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().max(2000).optional(),
  nextRetryAt: z.string().datetime().optional(),
});

export const listEventsQuerySchema = z.object({
  status: eventStatusSchema.optional(),
  priority: eventPrioritySchema.optional(),
  categoryId: z.string().uuid().optional(),
  eventTypeId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  branchCode: z.string().trim().max(120).optional(),
  countryCode: z.string().trim().max(120).optional(),
  workflowRef: z.string().trim().max(160).optional(),
});
