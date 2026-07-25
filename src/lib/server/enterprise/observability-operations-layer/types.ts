export type MonitoringScope = "system" | "application" | "database" | "api" | "queue" | "job" | "worker";

export type LogDomain = "security" | "financial" | "communication" | "ai" | "audit" | "application" | "operations";

export type MetricDomain = "business" | "technical" | "performance" | "financial" | "security" | "ai" | "usage";

export type HealthStatus = "healthy" | "degraded" | "critical" | "unknown";

export type IncidentSeverity = "sev0" | "sev1" | "sev2" | "sev3" | "sev4";

export type IncidentStatus = "open" | "investigating" | "mitigating" | "resolved" | "postmortem" | "closed";

export type FlagScope = "global" | "country" | "department" | "beta";

export type ConfigScope = "global" | "region" | "country" | "department" | "service";

export type BackupTier = "hot" | "warm" | "cold";

export type ReliabilityTargetKind = "sla" | "slo" | "error_budget" | "availability";

export type OpsEventSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface OpsLogSinkAdapter {
  providerCode: string;
  publish(input: {
    correlationId: string;
    traceId?: string;
    domain: LogDomain;
    level: "debug" | "info" | "warn" | "error";
    message: string;
    payload?: Record<string, unknown>;
  }): Promise<{ accepted: boolean; reference?: string }>;
}

export interface OpsMetricsAdapter {
  providerCode: string;
  emit(input: {
    metricCode: string;
    metricDomain: MetricDomain;
    value: number;
    unit?: string;
    tags?: Record<string, unknown>;
    observedAt?: string;
  }): Promise<{ accepted: boolean; reference?: string }>;
}

export interface TraceExporterAdapter {
  providerCode: string;
  exportSpan(input: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    service: string;
    operation: string;
    status: "ok" | "error";
    latencyMs: number;
    attributes?: Record<string, unknown>;
    startedAt: string;
    endedAt: string;
  }): Promise<{ accepted: boolean; reference?: string }>;
}

export interface OpsAuditEventInput {
  organizationId?: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  sourceDomain: "monitoring" | "logging" | "metrics" | "tracing" | "health" | "incident" | "feature_flag" | "configuration" | "backup" | "performance" | "reliability" | "secops" | "system";
  sourceReference?: string;
  actorAuthUserId?: string;
  actorRole?: string;
  severity: OpsEventSeverity;
  correlationId?: string;
  traceId?: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export type ObservabilityPermissionCode =
  | "ops.monitoring.read"
  | "ops.monitoring.manage"
  | "ops.logging.read"
  | "ops.logging.manage"
  | "ops.metrics.read"
  | "ops.metrics.manage"
  | "ops.tracing.read"
  | "ops.health.manage"
  | "ops.incidents.manage"
  | "ops.flags.manage"
  | "ops.config.manage"
  | "ops.backup.manage"
  | "ops.performance.manage"
  | "ops.reliability.manage"
  | "ops.securityops.manage"
  | "ops.audit.read";
