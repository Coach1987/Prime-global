import { z } from "zod";

const codeSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9_.:-]+$/i);
const nameSchema = z.string().trim().min(2).max(180);
const metadataSchema = z.record(z.unknown()).default({});
const localeSchema = z.string().trim().min(2).max(16);

export const listByOrganizationCommunicationQuerySchema = z.object({
  organizationId: z.string().uuid(),
});

export const createCorporateMailIdentitySchema = z.object({
  organizationId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  identityType: z.enum(["individual", "shared", "department", "role", "system"]),
  localPart: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(3).max(190),
  displayName: nameSchema,
  status: z.enum(["active", "suspended", "archived"]).default("active"),
  metadata: metadataSchema,
});

export const createMailboxSchema = z.object({
  organizationId: z.string().uuid(),
  mailboxCode: codeSchema,
  mailboxType: z.enum(["shared", "department", "role", "system"]),
  name: nameSchema,
  identityId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  retentionPolicyId: z.string().uuid().optional(),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const addMailboxMemberSchema = z.object({
  mailboxId: z.string().uuid(),
  employeeId: z.string().uuid(),
  memberRole: z.enum(["owner", "manager", "sender", "viewer", "auditor"]),
  canSend: z.boolean().default(false),
  canManage: z.boolean().default(false),
});

export const createRetentionPolicySchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  channelScope: z.enum(["email", "in_app", "sms", "whatsapp", "push", "all"]),
  retentionDays: z.number().int().min(1).max(3650),
  legalHoldSupported: z.boolean().default(true),
  autoArchive: z.boolean().default(true),
  autoDelete: z.boolean().default(false),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createCommunicationTemplateSchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  templateType: z.enum(["email", "sms", "whatsapp", "notification", "announcement"]),
  category: z.string().trim().min(2).max(80),
  status: z.enum(["draft", "in_review", "approved", "rejected", "retired"]).default("draft"),
  metadata: metadataSchema,
});

export const createTemplateVersionSchema = z.object({
  templateId: z.string().uuid(),
  versionNumber: z.number().int().min(1),
  approvalStatus: z.enum(["draft", "in_review", "approved", "rejected"]).default("draft"),
  changeSummary: z.string().trim().max(2000).optional(),
  content: metadataSchema,
});

export const createTemplateLocalizationSchema = z.object({
  templateVersionId: z.string().uuid(),
  locale: localeSchema,
  title: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1).max(12000),
  variables: z.array(z.string().trim().max(80)).default([]),
  fallbackLocale: localeSchema.optional(),
});

export const createTemplateApprovalRequestSchema = z.object({
  templateVersionId: z.string().uuid(),
  reviewerRoleCode: codeSchema.optional(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).default("pending"),
  decisionNote: z.string().trim().max(2000).optional(),
});

export const createInternalMessageSchema = z.object({
  organizationId: z.string().uuid(),
  messageType: z.enum(["department", "management", "employee_announcement", "system_broadcast"]),
  departmentId: z.string().uuid().optional(),
  senderEmployeeId: z.string().uuid().optional(),
  senderRoleCode: codeSchema.optional(),
  title: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(12000),
  sensitivity: z.enum(["normal", "sensitive", "restricted"]).default("normal"),
  pinned: z.boolean().default(false),
  pinnedUntil: z.string().datetime().optional(),
  recipientEmployeeIds: z.array(z.string().uuid()).default([]),
  metadata: metadataSchema,
});

export const acknowledgeInternalMessageSchema = z.object({
  messageId: z.string().uuid(),
  recipientEmployeeId: z.string().uuid(),
  acknowledgementNote: z.string().trim().max(2000).optional(),
});

export const createCommunicationProviderConfigSchema = z.object({
  organizationId: z.string().uuid(),
  providerId: z.string().uuid(),
  mode: z.enum(["test", "live"]).default("test"),
  config: metadataSchema,
  metadata: metadataSchema,
  priority: z.number().int().min(1).max(1000).default(100),
  isFallback: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createCommunicationEventSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  sourceDomain: z.enum(["recruitment", "payments", "billing", "interviews", "documents", "ai", "security", "system"]),
  sourceEventCode: codeSchema,
  templateId: z.string().uuid().optional(),
  notificationRuleId: z.string().uuid().optional(),
  enabled: z.boolean().default(true),
  metadata: metadataSchema,
});

export const createCommunicationDeliverySchema = z.object({
  organizationId: z.string().uuid().optional(),
  messageRef: z.string().trim().min(2).max(180),
  channelType: z.enum(["email", "sms", "whatsapp", "push", "in_app"]),
  providerConfigId: z.string().uuid().optional(),
  recipientRef: z.string().trim().min(2).max(320),
  status: z.enum(["queued", "processing", "sent", "delivered", "failed", "cancelled"]),
  priority: z.enum(["low", "normal", "high", "critical", "emergency"]).default("normal"),
  maxAttempts: z.number().int().min(1).max(25).default(5),
  metadata: metadataSchema,
});

export const createCommunicationComplianceLogSchema = z.object({
  organizationId: z.string().uuid().optional(),
  actionCode: codeSchema,
  subjectType: z.string().trim().max(120).optional(),
  subjectId: z.string().trim().max(180).optional(),
  outcome: z.enum(["success", "failure", "manual_review"]),
  details: metadataSchema,
});

export const createCommunicationEventSchema = z.object({
  organizationId: z.string().uuid().optional(),
  eventType: codeSchema,
  aggregateType: z.string().trim().min(2).max(120),
  aggregateId: z.string().trim().min(1).max(180),
  sourceDomain: z.enum(["recruitment", "payments", "billing", "interviews", "documents", "ai", "security", "system"]),
  sourceReference: z.string().trim().max(180).optional(),
  idempotencyKey: z.string().trim().max(180).optional(),
  payload: metadataSchema,
  metadata: metadataSchema,
  occurredAt: z.string().datetime().optional(),
});
