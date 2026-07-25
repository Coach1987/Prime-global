import { createSupabaseAdminClient } from "../../supabase.ts";
import type { OpsAuditEventInput } from "./types.ts";

async function listRows<T>(table: string, organizationId?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function createRow<T>(table: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data as T;
}

export function evaluateSloBurnRate(input: {
  targetAvailability: number;
  observedAvailability: number;
  windowMinutes: number;
}): { breached: boolean; burnRate: number; errorBudgetConsumed: number } {
  const targetErrorBudget = Math.max(0.0001, 100 - input.targetAvailability);
  const observedErrorRate = Math.max(0, 100 - input.observedAvailability);
  const burnRate = observedErrorRate / targetErrorBudget;
  const errorBudgetConsumed = Math.min(100, burnRate * (input.windowMinutes / 1440) * 100);

  return {
    breached: burnRate > 1,
    burnRate,
    errorBudgetConsumed,
  };
}

export async function recordObservabilityAuditEvent(input: OpsAuditEventInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("pgems_record_observability_event", {
    p_organization_id: input.organizationId ?? null,
    p_event_type: input.eventType,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_source_domain: input.sourceDomain,
    p_source_reference: input.sourceReference ?? null,
    p_actor_auth_user_id: input.actorAuthUserId ?? null,
    p_actor_role: input.actorRole ?? null,
    p_severity: input.severity,
    p_correlation_id: input.correlationId ?? null,
    p_trace_id: input.traceId ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_payload: input.payload ?? {},
    p_metadata: input.metadata ?? {},
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw error;
  return data;
}

export async function listMonitoringChecks(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_monitoring_checks", organizationId);
}

export async function createMonitoringCheck(payload: {
  organizationId: string;
  checkCode: string;
  scope: "system" | "application" | "database" | "api" | "queue" | "job" | "worker";
  targetRef: string;
  status: "healthy" | "degraded" | "critical" | "unknown";
  latencyMs?: number;
  errorRate?: number;
  availabilityPercent?: number;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_monitoring_checks", {
    organization_id: payload.organizationId,
    check_code: payload.checkCode,
    scope: payload.scope,
    target_ref: payload.targetRef,
    status: payload.status,
    latency_ms: payload.latencyMs ?? null,
    error_rate: payload.errorRate ?? 0,
    availability_percent: payload.availabilityPercent ?? 100,
    details: payload.details ?? {},
    metadata: payload.metadata ?? {},
  });
}

export async function listLogEntries(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_log_entries", organizationId);
}

export async function createLogEntry(payload: {
  organizationId: string;
  domain: "security" | "financial" | "communication" | "ai" | "audit" | "application" | "operations";
  level: "debug" | "info" | "warn" | "error";
  message: string;
  correlationId: string;
  traceId?: string;
  actorRef?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_log_entries", {
    organization_id: payload.organizationId,
    domain: payload.domain,
    level: payload.level,
    message: payload.message,
    correlation_id: payload.correlationId,
    trace_id: payload.traceId ?? null,
    actor_ref: payload.actorRef ?? null,
    payload: payload.payload ?? {},
    metadata: payload.metadata ?? {},
  });
}

export async function listMetricPoints(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_metric_points", organizationId);
}

export async function createMetricPoint(payload: {
  organizationId: string;
  metricCode: string;
  metricDomain: "business" | "technical" | "performance" | "financial" | "security" | "ai" | "usage";
  value: number;
  unit?: string;
  tags?: Record<string, unknown>;
  observedAt?: string;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_metric_points", {
    organization_id: payload.organizationId,
    metric_code: payload.metricCode,
    metric_domain: payload.metricDomain,
    value: payload.value,
    unit: payload.unit ?? null,
    tags: payload.tags ?? {},
    observed_at: payload.observedAt ?? new Date().toISOString(),
    metadata: payload.metadata ?? {},
  });
}

export async function listTraceSpans(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_trace_spans", organizationId);
}

export async function createTraceSpan(payload: {
  organizationId: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId?: string;
  serviceName: string;
  operationName: string;
  status: "ok" | "error";
  latencyMs: number;
  startedAt: string;
  endedAt: string;
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_trace_spans", {
    organization_id: payload.organizationId,
    trace_id: payload.traceId,
    span_id: payload.spanId,
    parent_span_id: payload.parentSpanId ?? null,
    correlation_id: payload.correlationId ?? null,
    service_name: payload.serviceName,
    operation_name: payload.operationName,
    status: payload.status,
    latency_ms: payload.latencyMs,
    started_at: payload.startedAt,
    ended_at: payload.endedAt,
    attributes: payload.attributes ?? {},
    metadata: payload.metadata ?? {},
  });
}

export async function listHealthChecks(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_health_checks", organizationId);
}

export async function createHealthCheck(payload: {
  organizationId: string;
  dependencyType: "application" | "database" | "queue" | "storage" | "ai_provider" | "external_service" | "internal_service";
  dependencyRef: string;
  status: "healthy" | "degraded" | "critical" | "unknown";
  responseTimeMs?: number;
  message?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_health_checks", {
    organization_id: payload.organizationId,
    dependency_type: payload.dependencyType,
    dependency_ref: payload.dependencyRef,
    status: payload.status,
    response_time_ms: payload.responseTimeMs ?? null,
    message: payload.message ?? null,
    details: payload.details ?? {},
    metadata: payload.metadata ?? {},
  });
}

export async function listIncidents(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_incidents", organizationId);
}

export async function createIncident(payload: {
  organizationId: string;
  incidentCode: string;
  title: string;
  severity: "sev0" | "sev1" | "sev2" | "sev3" | "sev4";
  status: "open" | "investigating" | "mitigating" | "resolved" | "postmortem" | "closed";
  impactedServices?: unknown[];
  detectedAt?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  ownerTeam?: string;
  escalationPolicyRef?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_incidents", {
    organization_id: payload.organizationId,
    incident_code: payload.incidentCode,
    title: payload.title,
    severity: payload.severity,
    status: payload.status,
    impacted_services: payload.impactedServices ?? [],
    detected_at: payload.detectedAt ?? new Date().toISOString(),
    acknowledged_at: payload.acknowledgedAt ?? null,
    resolved_at: payload.resolvedAt ?? null,
    owner_team: payload.ownerTeam ?? null,
    escalation_policy_ref: payload.escalationPolicyRef ?? null,
    details: payload.details ?? {},
    metadata: payload.metadata ?? {},
  });
}

export async function addIncidentTimelineEvent(payload: {
  incidentId: string;
  eventType: string;
  message: string;
  actorAuthUserId?: string;
  actorRole?: string;
  details?: Record<string, unknown>;
  occurredAt?: string;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_incident_timeline", {
    incident_id: payload.incidentId,
    event_type: payload.eventType,
    message: payload.message,
    actor_auth_user_id: payload.actorAuthUserId ?? null,
    actor_role: payload.actorRole ?? null,
    details: payload.details ?? {},
    occurred_at: payload.occurredAt ?? new Date().toISOString(),
  });
}

export async function listFeatureFlags(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_feature_flags", organizationId);
}

export async function createFeatureFlag(payload: {
  organizationId: string;
  flagKey: string;
  description?: string;
  scope: "global" | "country" | "department" | "beta";
  countryCode?: string;
  departmentId?: string;
  rolloutPercent?: number;
  enabled: boolean;
  rules?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_feature_flags", {
    organization_id: payload.organizationId,
    flag_key: payload.flagKey,
    description: payload.description ?? null,
    scope: payload.scope,
    country_code: payload.countryCode ?? null,
    department_id: payload.departmentId ?? null,
    rollout_percent: payload.rolloutPercent ?? 100,
    enabled: payload.enabled,
    rules: payload.rules ?? {},
    metadata: payload.metadata ?? {},
  });
}

export async function listConfigProfiles(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_config_profiles", organizationId);
}

export async function createConfigProfile(payload: {
  organizationId: string;
  configCode: string;
  scope: "global" | "region" | "country" | "department" | "service";
  scopeRef?: string;
  versionNumber: number;
  runtimeConfig: Record<string, unknown>;
  secretsRefs?: Record<string, unknown>;
  safeMode?: boolean;
  status: "draft" | "active" | "deprecated" | "archived";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_config_profiles", {
    organization_id: payload.organizationId,
    config_code: payload.configCode,
    scope: payload.scope,
    scope_ref: payload.scopeRef ?? null,
    version_number: payload.versionNumber,
    runtime_config: payload.runtimeConfig,
    secrets_refs: payload.secretsRefs ?? {},
    safe_mode: payload.safeMode ?? true,
    status: payload.status,
    metadata: payload.metadata ?? {},
  });
}

export async function listBackupPolicies(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_backup_policies", organizationId);
}

export async function createBackupPolicy(payload: {
  organizationId: string;
  policyCode: string;
  resourceType: "database" | "storage" | "logs" | "metrics" | "config" | "events";
  scheduleCron: string;
  retentionDays: number;
  backupTier: "hot" | "warm" | "cold";
  encrypted: boolean;
  rpoMinutes: number;
  rtoMinutes: number;
  drPlanRef?: string;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_backup_policies", {
    organization_id: payload.organizationId,
    policy_code: payload.policyCode,
    resource_type: payload.resourceType,
    schedule_cron: payload.scheduleCron,
    retention_days: payload.retentionDays,
    backup_tier: payload.backupTier,
    encrypted: payload.encrypted,
    rpo_minutes: payload.rpoMinutes,
    rto_minutes: payload.rtoMinutes,
    dr_plan_ref: payload.drPlanRef ?? null,
    metadata: payload.metadata ?? {},
    is_active: payload.isActive ?? true,
  });
}

export async function listPerformanceBaselines(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_performance_baselines", organizationId);
}

export async function createPerformanceBaseline(payload: {
  organizationId: string;
  serviceName: string;
  endpointRef?: string;
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
  errorRateTarget?: number;
  cpuPercentTarget?: number;
  memoryPercentTarget?: number;
  throughputTarget?: number;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_performance_baselines", {
    organization_id: payload.organizationId,
    service_name: payload.serviceName,
    endpoint_ref: payload.endpointRef ?? null,
    p50_ms: payload.p50Ms ?? null,
    p95_ms: payload.p95Ms ?? null,
    p99_ms: payload.p99Ms ?? null,
    error_rate_target: payload.errorRateTarget ?? null,
    cpu_percent_target: payload.cpuPercentTarget ?? null,
    memory_percent_target: payload.memoryPercentTarget ?? null,
    throughput_target: payload.throughputTarget ?? null,
    metadata: payload.metadata ?? {},
  });
}

export async function listReliabilityObjectives(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_reliability_objectives", organizationId);
}

export async function createReliabilityObjective(payload: {
  organizationId: string;
  objectiveCode: string;
  objectiveKind: "sla" | "slo" | "error_budget" | "availability";
  serviceName: string;
  targetValue: number;
  windowMinutes: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_reliability_objectives", {
    organization_id: payload.organizationId,
    objective_code: payload.objectiveCode,
    objective_kind: payload.objectiveKind,
    service_name: payload.serviceName,
    target_value: payload.targetValue,
    window_minutes: payload.windowMinutes,
    warning_threshold: payload.warningThreshold ?? null,
    critical_threshold: payload.criticalThreshold ?? null,
    metadata: payload.metadata ?? {},
    is_active: payload.isActive ?? true,
  });
}

export async function listSecurityOpsAlerts(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_ops_security_alerts", organizationId);
}

export async function createSecurityOpsAlert(payload: {
  organizationId: string;
  alertCode: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  signalType: "threat_detection" | "suspicious_activity" | "compliance_event" | "policy_violation" | "anomaly";
  status: "open" | "investigating" | "mitigated" | "false_positive" | "closed";
  sourceRef?: string;
  correlationId?: string;
  traceId?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_ops_security_alerts", {
    organization_id: payload.organizationId,
    alert_code: payload.alertCode,
    severity: payload.severity,
    title: payload.title,
    signal_type: payload.signalType,
    status: payload.status,
    source_ref: payload.sourceRef ?? null,
    correlation_id: payload.correlationId ?? null,
    trace_id: payload.traceId ?? null,
    details: payload.details ?? {},
    metadata: payload.metadata ?? {},
  });
}

export async function listObservabilityEvents(organizationId?: string) {
  return listRows<Record<string, unknown>>("pgems_ops_events", organizationId);
}
