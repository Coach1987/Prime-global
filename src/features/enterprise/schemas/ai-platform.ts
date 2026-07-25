import { z } from "zod";

const codeSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i);
const nameSchema = z.string().trim().min(2).max(180);
const metadataSchema = z.record(z.unknown()).default({});
const localeSchema = z.string().trim().min(2).max(16).default("en");

export const aiProviderKindSchema = z.enum(["openai", "anthropic", "google_gemini", "azure_openai", "deepseek", "local_llm", "future"]);
export const aiTaskTypeSchema = z.enum([
  "classification",
  "extraction",
  "summarization",
  "matching",
  "recommendation",
  "translation",
  "reasoning",
  "scoring",
  "ranking",
  "moderation",
  "embeddings",
  "custom",
]);
export const aiRequestStatusSchema = z.enum(["created", "routed", "queued", "processing", "completed", "failed", "cancelled"]);
export const aiResponseStatusSchema = z.enum(["success", "partial", "failed", "blocked", "cached"]);
export const aiSafetyStatusSchema = z.enum(["pending", "passed", "blocked", "needs_review"]);

export const createAiProviderSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  providerKind: aiProviderKindSchema,
  region: z.string().trim().max(80).default("global"),
  complianceTags: z.array(z.string().trim().min(1).max(80)).default([]),
  healthScore: z.number().min(0).max(100).default(100),
  supportsStreaming: z.boolean().default(false),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createAiModelSchema = z.object({
  providerId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  modelFamily: z.string().trim().min(1).max(80),
  version: z.string().trim().min(1).max(80),
  contextWindow: z.number().int().positive().default(8192),
  maxOutputTokens: z.number().int().positive().default(1024),
  latencyTier: z.enum(["low", "standard", "high"]).default("standard"),
  estimatedCostInputPer1k: z.number().nonnegative().default(0),
  estimatedCostOutputPer1k: z.number().nonnegative().default(0),
  capabilities: z.array(z.string().trim().min(1).max(80)).default([]),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createAiPromptSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  taskType: aiTaskTypeSchema,
  locale: localeSchema,
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createAiPromptVersionSchema = z.object({
  promptId: z.string().uuid(),
  versionLabel: z.string().trim().min(1).max(80),
  systemPrompt: z.string().trim().min(1).max(12000),
  developerPrompt: z.string().trim().max(12000).default(""),
  userPromptTemplate: z.string().trim().min(1).max(12000),
  variables: z.array(codeSchema).default([]),
  locale: localeSchema,
  metadata: metadataSchema,
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createAiPolicySchema = z.object({
  code: codeSchema,
  name: nameSchema,
  taskType: aiTaskTypeSchema.optional(),
  minAuthorityLevel: z.number().int().min(0).max(100).default(0),
  requiresHumanReview: z.boolean().default(false),
  safetyProfile: z.enum(["standard", "strict", "sensitive"]).default("standard"),
  rateLimitTier: z.enum(["default", "elevated", "critical"]).default("default"),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createAiRoutingRuleSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  taskType: aiTaskTypeSchema,
  preferredProviderId: z.string().uuid().optional(),
  preferredModelId: z.string().uuid().optional(),
  maxLatencyMs: z.number().int().positive().optional(),
  maxEstimatedCost: z.number().nonnegative().optional(),
  requiredRegion: z.string().trim().max(80).optional(),
  requiredComplianceTags: z.array(z.string().trim().min(1).max(80)).default([]),
  priority: z.enum(["low", "normal", "high", "critical", "emergency"]).default("normal"),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createAiFallbackRuleSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  taskType: aiTaskTypeSchema,
  primaryProviderId: z.string().uuid(),
  fallbackProviderId: z.string().uuid(),
  fallbackModelId: z.string().uuid().optional(),
  triggerReason: z.enum(["provider_down", "timeout", "cost_limit", "rate_limited", "safety_block", "manual"]).default("provider_down"),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createAiTaskSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  taskType: aiTaskTypeSchema,
  promptId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  routingRuleId: z.string().uuid().optional(),
  fallbackRuleId: z.string().uuid().optional(),
  locale: localeSchema,
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createAiRequestSchema = z.object({
  taskId: z.string().uuid(),
  promptVersionId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  sourceEventId: z.string().uuid().optional(),
  correlationId: z.string().trim().min(1).max(160),
  traceId: z.string().trim().min(1).max(160),
  inputPayload: metadataSchema,
  inputHash: z.string().trim().min(1).max(200),
  locale: localeSchema,
  status: aiRequestStatusSchema.default("created"),
  priority: z.enum(["low", "normal", "high", "critical", "emergency"]).default("normal"),
  metadata: metadataSchema,
});

export const createAiResponseSchema = z.object({
  requestId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  responsePayload: metadataSchema,
  outputText: z.string().trim().max(50000).default(""),
  outputEmbedding: z.array(z.number()).default([]),
  tokenInput: z.number().int().nonnegative().default(0),
  tokenOutput: z.number().int().nonnegative().default(0),
  estimatedCost: z.number().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().default(0),
  status: aiResponseStatusSchema.default("success"),
  safetyStatus: aiSafetyStatusSchema.default("pending"),
  cached: z.boolean().default(false),
  metadata: metadataSchema,
});

export const createAiUsageSchema = z.object({
  requestId: z.string().uuid().optional(),
  responseId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  taskType: aiTaskTypeSchema,
  usageDate: z.string().date(),
  tokenInput: z.number().int().nonnegative().default(0),
  tokenOutput: z.number().int().nonnegative().default(0),
  estimatedCost: z.number().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().default(0),
  metadata: metadataSchema,
});

export const createAiCacheEntrySchema = z.object({
  cacheKey: z.string().trim().min(1).max(200),
  requestHash: z.string().trim().min(1).max(200),
  responsePayload: metadataSchema,
  expiresAt: z.string().datetime(),
  metadata: metadataSchema,
});

export const createAiTelemetrySchema = z.object({
  requestId: z.string().uuid().optional(),
  responseId: z.string().uuid().optional(),
  metricName: codeSchema,
  metricValue: z.number(),
  metricUnit: z.string().trim().max(40).default("count"),
  dimensions: metadataSchema,
});

export const createAiAuditSchema = z.object({
  requestId: z.string().uuid().optional(),
  responseId: z.string().uuid().optional(),
  actionCode: codeSchema,
  actorType: z.enum(["user", "system", "service"]).default("system"),
  actorKey: z.string().trim().min(1).max(160),
  outcome: z.enum(["success", "failure", "manual_review"]).default("success"),
  reason: z.string().trim().max(2000).optional(),
  metadata: metadataSchema,
});

export const createAiSafetyCheckSchema = z.object({
  requestId: z.string().uuid().optional(),
  responseId: z.string().uuid().optional(),
  policyId: z.string().uuid().optional(),
  status: aiSafetyStatusSchema,
  riskScore: z.number().min(0).max(100).default(0),
  flags: z.array(z.string().trim().min(1).max(80)).default([]),
  explanation: z.string().trim().max(2000).optional(),
  metadata: metadataSchema,
});

export const createAiRateLimitSchema = z.object({
  scopeKey: z.string().trim().min(1).max(160),
  taskType: aiTaskTypeSchema.optional(),
  providerId: z.string().uuid().optional(),
  windowSeconds: z.number().int().positive().default(60),
  maxRequests: z.number().int().positive().default(60),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const selectAiRouteSchema = z.object({
  taskType: aiTaskTypeSchema,
  priority: z.enum(["low", "normal", "high", "critical", "emergency"]).default("normal"),
  requiredRegion: z.string().trim().max(80).optional(),
  requiredComplianceTags: z.array(z.string().trim().min(1).max(80)).default([]),
  maxLatencyMs: z.number().int().positive().optional(),
  maxEstimatedCost: z.number().nonnegative().optional(),
});

export const renderPromptSchema = z.object({
  promptVersionId: z.string().uuid(),
  variables: metadataSchema,
});

export const executeAiTaskSchema = z.object({
  taskId: z.string().uuid(),
  requestId: z.string().uuid(),
  dryRun: z.boolean().default(false),
});

export const publishAiEventSchema = z.object({
  eventTypeId: z.string().uuid(),
  categoryId: z.string().uuid(),
  channelId: z.string().uuid(),
  publisherId: z.string().uuid(),
  queueId: z.string().uuid(),
  kind: z.enum(["domain", "system", "business"]).default("system"),
  priority: z.enum(["low", "normal", "high", "critical", "emergency"]).default("normal"),
  status: z.enum(["created", "queued", "processing", "delivered", "failed", "cancelled", "retried", "archived"]).default("queued"),
  correlationId: z.string().trim().min(1).max(160),
  traceId: z.string().trim().min(1).max(160),
  idempotencyKey: z.string().trim().min(1).max(200),
  payload: metadataSchema,
  metadata: metadataSchema,
  maxRetryCount: z.number().int().min(0).max(100).default(5),
});

export const consumeAiEventSchema = z.object({
  eventId: z.string().uuid(),
  metadata: metadataSchema,
});
