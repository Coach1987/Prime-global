import { z } from "zod";

const codeSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9_.:-]+$/i);
const metadataSchema = z.record(z.unknown()).default({});

export const listByOrganizationObservabilityQuerySchema = z.object({
  organizationId: z.string().uuid(),
});

export const createMonitoringCheckSchema = z.object({
  organizationId: z.string().uuid(),
  checkCode: codeSchema,
  scope: z.enum(["system", "application", "database", "api", "queue", "job", "worker"]),
  targetRef: z.string().trim().min(2).max(220),
  status: z.enum(["healthy", "degraded", "critical", "unknown"]),
  latencyMs: z.number().nonnegative().optional(),
  errorRate: z.number().min(0).max(100).default(0),
  availabilityPercent: z.number().min(0).max(100).default(100),
  details: metadataSchema,
  metadata: metadataSchema,
});

export const createLogEntrySchema = z.object({
  organizationId: z.string().uuid(),
  domain: z.enum(["security", "financial", "communication", "ai", "audit", "application", "operations"]),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string().trim().min(1).max(4000),
  correlationId: z.string().trim().min(2).max(180),
  traceId: z.string().trim().max(180).optional(),
  actorRef: z.string().trim().max(180).optional(),
  payload: metadataSchema,
  metadata: metadataSchema,
});

export const createMetricPointSchema = z.object({
  organizationId: z.string().uuid(),
  metricCode: codeSchema,
  metricDomain: z.enum(["business", "technical", "performance", "financial", "security", "ai", "usage"]),
  value: z.number(),
  unit: z.string().trim().max(40).optional(),
  tags: metadataSchema,
  observedAt: z.string().datetime().optional(),
  metadata: metadataSchema,
});

export const createTraceSpanSchema = z.object({
  organizationId: z.string().uuid(),
  traceId: z.string().trim().min(8).max(180),
  spanId: z.string().trim().min(8).max(180),
  parentSpanId: z.string().trim().max(180).optional(),
  correlationId: z.string().trim().max(180).optional(),
  serviceName: z.string().trim().min(2).max(180),
  operationName: z.string().trim().min(2).max(220),
  status: z.enum(["ok", "error"]),
  latencyMs: z.number().nonnegative(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  attributes: metadataSchema,
  metadata: metadataSchema,
});

export const createHealthCheckSchema = z.object({
  organizationId: z.string().uuid(),
  dependencyType: z.enum(["application", "database", "queue", "storage", "ai_provider", "external_service", "internal_service"]),
  dependencyRef: z.string().trim().min(2).max(220),
  status: z.enum(["healthy", "degraded", "critical", "unknown"]),
  responseTimeMs: z.number().nonnegative().optional(),
  message: z.string().trim().max(1000).optional(),
  details: metadataSchema,
  metadata: metadataSchema,
});

export const createIncidentSchema = z.object({
  organizationId: z.string().uuid(),
  incidentCode: codeSchema,
  title: z.string().trim().min(2).max(220),
  severity: z.enum(["sev0", "sev1", "sev2", "sev3", "sev4"]),
  status: z.enum(["open", "investigating", "mitigating", "resolved", "postmortem", "closed"]),
  impactedServices: z.array(z.string().trim().max(180)).default([]),
  detectedAt: z.string().datetime().optional(),
  acknowledgedAt: z.string().datetime().optional(),
  resolvedAt: z.string().datetime().optional(),
  ownerTeam: z.string().trim().max(120).optional(),
  escalationPolicyRef: z.string().trim().max(180).optional(),
  details: metadataSchema,
  metadata: metadataSchema,
});

export const createIncidentTimelineEventSchema = z.object({
  incidentId: z.string().uuid(),
  eventType: codeSchema,
  message: z.string().trim().min(2).max(2000),
  actorAuthUserId: z.string().uuid().optional(),
  actorRole: z.string().trim().max(120).optional(),
  details: metadataSchema,
  occurredAt: z.string().datetime().optional(),
});

export const createFeatureFlagSchema = z.object({
  organizationId: z.string().uuid(),
  flagKey: codeSchema,
  description: z.string().trim().max(1000).optional(),
  scope: z.enum(["global", "country", "department", "beta"]),
  countryCode: z.string().trim().min(2).max(10).transform((value) => value.toUpperCase()).optional(),
  departmentId: z.string().uuid().optional(),
  rolloutPercent: z.number().min(0).max(100).default(100),
  enabled: z.boolean(),
  rules: metadataSchema,
  metadata: metadataSchema,
});

export const createConfigProfileSchema = z.object({
  organizationId: z.string().uuid(),
  configCode: codeSchema,
  scope: z.enum(["global", "region", "country", "department", "service"]),
  scopeRef: z.string().trim().max(180).optional(),
  versionNumber: z.number().int().min(1),
  runtimeConfig: metadataSchema,
  secretsRefs: metadataSchema,
  safeMode: z.boolean().default(true),
  status: z.enum(["draft", "active", "deprecated", "archived"]),
  metadata: metadataSchema,
});

export const createBackupPolicySchema = z.object({
  organizationId: z.string().uuid(),
  policyCode: codeSchema,
  resourceType: z.enum(["database", "storage", "logs", "metrics", "config", "events"]),
  scheduleCron: z.string().trim().min(5).max(160),
  retentionDays: z.number().int().min(1).max(3650),
  backupTier: z.enum(["hot", "warm", "cold"]),
  encrypted: z.boolean().default(true),
  rpoMinutes: z.number().int().min(1).max(10080),
  rtoMinutes: z.number().int().min(1).max(10080),
  drPlanRef: z.string().trim().max(180).optional(),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createPerformanceBaselineSchema = z.object({
  organizationId: z.string().uuid(),
  serviceName: z.string().trim().min(2).max(180),
  endpointRef: z.string().trim().max(220).optional(),
  p50Ms: z.number().nonnegative().optional(),
  p95Ms: z.number().nonnegative().optional(),
  p99Ms: z.number().nonnegative().optional(),
  errorRateTarget: z.number().min(0).max(100).optional(),
  cpuPercentTarget: z.number().min(0).max(100).optional(),
  memoryPercentTarget: z.number().min(0).max(100).optional(),
  throughputTarget: z.number().nonnegative().optional(),
  metadata: metadataSchema,
});

export const createReliabilityObjectiveSchema = z.object({
  organizationId: z.string().uuid(),
  objectiveCode: codeSchema,
  objectiveKind: z.enum(["sla", "slo", "error_budget", "availability"]),
  serviceName: z.string().trim().min(2).max(180),
  targetValue: z.number().min(0).max(100),
  windowMinutes: z.number().int().min(1).max(10080),
  warningThreshold: z.number().min(0).max(100).optional(),
  criticalThreshold: z.number().min(0).max(100).optional(),
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createSecurityOpsAlertSchema = z.object({
  organizationId: z.string().uuid(),
  alertCode: codeSchema,
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  title: z.string().trim().min(2).max(220),
  signalType: z.enum(["threat_detection", "suspicious_activity", "compliance_event", "policy_violation", "anomaly"]),
  status: z.enum(["open", "investigating", "mitigated", "false_positive", "closed"]),
  sourceRef: z.string().trim().max(180).optional(),
  correlationId: z.string().trim().max(180).optional(),
  traceId: z.string().trim().max(180).optional(),
  details: metadataSchema,
  metadata: metadataSchema,
});

export const createObservabilityAuditEventSchema = z.object({
  organizationId: z.string().uuid().optional(),
  eventType: codeSchema,
  aggregateType: z.string().trim().min(2).max(120),
  aggregateId: z.string().trim().min(1).max(180),
  sourceDomain: z.enum(["monitoring", "logging", "metrics", "tracing", "health", "incident", "feature_flag", "configuration", "backup", "performance", "reliability", "secops", "system"]),
  sourceReference: z.string().trim().max(180).optional(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]).default("info"),
  correlationId: z.string().trim().max(180).optional(),
  traceId: z.string().trim().max(180).optional(),
  idempotencyKey: z.string().trim().max(180).optional(),
  payload: metadataSchema,
  metadata: metadataSchema,
  occurredAt: z.string().datetime().optional(),
});
