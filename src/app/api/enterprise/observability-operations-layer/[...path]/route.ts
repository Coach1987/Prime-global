import { NextResponse } from "next/server";
import {
  createBackupPolicySchema,
  createConfigProfileSchema,
  createFeatureFlagSchema,
  createHealthCheckSchema,
  createIncidentSchema,
  createIncidentTimelineEventSchema,
  createLogEntrySchema,
  createMetricPointSchema,
  createMonitoringCheckSchema,
  createObservabilityAuditEventSchema,
  createPerformanceBaselineSchema,
  createReliabilityObjectiveSchema,
  createSecurityOpsAlertSchema,
  createTraceSpanSchema,
  listByOrganizationObservabilityQuerySchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  addIncidentTimelineEvent,
  createBackupPolicy,
  createConfigProfile,
  createFeatureFlag,
  createHealthCheck,
  createIncident,
  createLogEntry,
  createMetricPoint,
  createMonitoringCheck,
  createPerformanceBaseline,
  createReliabilityObjective,
  createSecurityOpsAlert,
  createTraceSpan,
  listBackupPolicies,
  listConfigProfiles,
  listFeatureFlags,
  listHealthChecks,
  listIncidents,
  listLogEntries,
  listMetricPoints,
  listMonitoringChecks,
  listObservabilityEvents,
  listPerformanceBaselines,
  listReliabilityObjectives,
  listSecurityOpsAlerts,
  listTraceSpans,
  recordObservabilityAuditEvent,
} from "../../../../../lib/server/enterprise/observability-operations-layer";
import { requireObservabilityOperationsAccess } from "../_shared";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function parseOrganizationId(request: Request) {
  const url = new URL(request.url);
  const parsed = listByOrganizationObservabilityQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsed.success) {
    return { error: jsonError("INVALID_QUERY", "organizationId is required", 400) };
  }

  return { organizationId: parsed.data.organizationId };
}

async function ensureAccess(request: Request) {
  const auth = await requireObservabilityOperationsAccess(request);
  if (auth instanceof NextResponse) return auth;
  return auth;
}

async function handleMonitoring(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listMonitoringChecks(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createMonitoringCheckSchema);
    if (parsed.error) return parsed.error;
    const data = await createMonitoringCheck({
      organizationId: parsed.data.organizationId,
      checkCode: parsed.data.checkCode,
      scope: parsed.data.scope,
      targetRef: parsed.data.targetRef,
      status: parsed.data.status,
      latencyMs: parsed.data.latencyMs,
      errorRate: parsed.data.errorRate ?? 0,
      availabilityPercent: parsed.data.availabilityPercent ?? 100,
      details: parsed.data.details ?? {},
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleLogging(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listLogEntries(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createLogEntrySchema);
    if (parsed.error) return parsed.error;
    const data = await createLogEntry({
      organizationId: parsed.data.organizationId,
      domain: parsed.data.domain,
      level: parsed.data.level,
      message: parsed.data.message,
      correlationId: parsed.data.correlationId,
      traceId: parsed.data.traceId,
      actorRef: parsed.data.actorRef,
      payload: parsed.data.payload ?? {},
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleMetrics(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listMetricPoints(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createMetricPointSchema);
    if (parsed.error) return parsed.error;
    const data = await createMetricPoint({
      organizationId: parsed.data.organizationId,
      metricCode: parsed.data.metricCode,
      metricDomain: parsed.data.metricDomain,
      value: parsed.data.value,
      unit: parsed.data.unit,
      tags: parsed.data.tags ?? {},
      observedAt: parsed.data.observedAt,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTracing(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listTraceSpans(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createTraceSpanSchema);
    if (parsed.error) return parsed.error;
    const data = await createTraceSpan({
      organizationId: parsed.data.organizationId,
      traceId: parsed.data.traceId,
      spanId: parsed.data.spanId,
      parentSpanId: parsed.data.parentSpanId,
      correlationId: parsed.data.correlationId,
      serviceName: parsed.data.serviceName,
      operationName: parsed.data.operationName,
      status: parsed.data.status,
      latencyMs: parsed.data.latencyMs,
      startedAt: parsed.data.startedAt,
      endedAt: parsed.data.endedAt,
      attributes: parsed.data.attributes ?? {},
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleHealth(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listHealthChecks(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createHealthCheckSchema);
    if (parsed.error) return parsed.error;
    const data = await createHealthCheck({
      organizationId: parsed.data.organizationId,
      dependencyType: parsed.data.dependencyType,
      dependencyRef: parsed.data.dependencyRef,
      status: parsed.data.status,
      responseTimeMs: parsed.data.responseTimeMs,
      message: parsed.data.message,
      details: parsed.data.details ?? {},
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleIncidents(request: Request, auth: { userId: string; role: string }, segments: string[]) {
  if (segments[1] === "timeline") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, createIncidentTimelineEventSchema);
    if (parsed.error) return parsed.error;
    const data = await addIncidentTimelineEvent({
      incidentId: parsed.data.incidentId,
      eventType: parsed.data.eventType,
      message: parsed.data.message,
      actorAuthUserId: parsed.data.actorAuthUserId ?? auth.userId,
      actorRole: parsed.data.actorRole ?? auth.role,
      details: parsed.data.details ?? {},
      occurredAt: parsed.data.occurredAt,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listIncidents(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createIncidentSchema);
    if (parsed.error) return parsed.error;
    const data = await createIncident({
      organizationId: parsed.data.organizationId,
      incidentCode: parsed.data.incidentCode,
      title: parsed.data.title,
      severity: parsed.data.severity,
      status: parsed.data.status,
      impactedServices: parsed.data.impactedServices ?? [],
      detectedAt: parsed.data.detectedAt,
      acknowledgedAt: parsed.data.acknowledgedAt,
      resolvedAt: parsed.data.resolvedAt,
      ownerTeam: parsed.data.ownerTeam,
      escalationPolicyRef: parsed.data.escalationPolicyRef,
      details: parsed.data.details ?? {},
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleFeatureFlags(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listFeatureFlags(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createFeatureFlagSchema);
    if (parsed.error) return parsed.error;
    const data = await createFeatureFlag({
      organizationId: parsed.data.organizationId,
      flagKey: parsed.data.flagKey,
      description: parsed.data.description,
      scope: parsed.data.scope,
      countryCode: parsed.data.countryCode,
      departmentId: parsed.data.departmentId,
      rolloutPercent: parsed.data.rolloutPercent ?? 100,
      enabled: parsed.data.enabled,
      rules: parsed.data.rules ?? {},
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleConfiguration(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listConfigProfiles(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createConfigProfileSchema);
    if (parsed.error) return parsed.error;
    const data = await createConfigProfile({
      organizationId: parsed.data.organizationId,
      configCode: parsed.data.configCode,
      scope: parsed.data.scope,
      scopeRef: parsed.data.scopeRef,
      versionNumber: parsed.data.versionNumber,
      runtimeConfig: parsed.data.runtimeConfig ?? {},
      secretsRefs: parsed.data.secretsRefs ?? {},
      safeMode: parsed.data.safeMode ?? true,
      status: parsed.data.status,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleDisasterRecovery(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listBackupPolicies(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createBackupPolicySchema);
    if (parsed.error) return parsed.error;
    const data = await createBackupPolicy({
      organizationId: parsed.data.organizationId,
      policyCode: parsed.data.policyCode,
      resourceType: parsed.data.resourceType,
      scheduleCron: parsed.data.scheduleCron,
      retentionDays: parsed.data.retentionDays,
      backupTier: parsed.data.backupTier,
      encrypted: parsed.data.encrypted ?? true,
      rpoMinutes: parsed.data.rpoMinutes,
      rtoMinutes: parsed.data.rtoMinutes,
      drPlanRef: parsed.data.drPlanRef,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePerformance(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listPerformanceBaselines(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createPerformanceBaselineSchema);
    if (parsed.error) return parsed.error;
    const data = await createPerformanceBaseline({
      organizationId: parsed.data.organizationId,
      serviceName: parsed.data.serviceName,
      endpointRef: parsed.data.endpointRef,
      p50Ms: parsed.data.p50Ms,
      p95Ms: parsed.data.p95Ms,
      p99Ms: parsed.data.p99Ms,
      errorRateTarget: parsed.data.errorRateTarget,
      cpuPercentTarget: parsed.data.cpuPercentTarget,
      memoryPercentTarget: parsed.data.memoryPercentTarget,
      throughputTarget: parsed.data.throughputTarget,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleReliability(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listReliabilityObjectives(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createReliabilityObjectiveSchema);
    if (parsed.error) return parsed.error;
    const data = await createReliabilityObjective({
      organizationId: parsed.data.organizationId,
      objectiveCode: parsed.data.objectiveCode,
      objectiveKind: parsed.data.objectiveKind,
      serviceName: parsed.data.serviceName,
      targetValue: parsed.data.targetValue,
      windowMinutes: parsed.data.windowMinutes,
      warningThreshold: parsed.data.warningThreshold,
      criticalThreshold: parsed.data.criticalThreshold,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSecurityOperations(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listSecurityOpsAlerts(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createSecurityOpsAlertSchema);
    if (parsed.error) return parsed.error;
    const data = await createSecurityOpsAlert({
      organizationId: parsed.data.organizationId,
      alertCode: parsed.data.alertCode,
      severity: parsed.data.severity,
      title: parsed.data.title,
      signalType: parsed.data.signalType,
      status: parsed.data.status,
      sourceRef: parsed.data.sourceRef,
      correlationId: parsed.data.correlationId,
      traceId: parsed.data.traceId,
      details: parsed.data.details ?? {},
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleAuditEvents(request: Request, auth: { userId: string; role: string }) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listObservabilityEvents(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createObservabilityAuditEventSchema);
    if (parsed.error) return parsed.error;
    const data = await recordObservabilityAuditEvent({
      organizationId: parsed.data.organizationId,
      eventType: parsed.data.eventType,
      aggregateType: parsed.data.aggregateType,
      aggregateId: parsed.data.aggregateId,
      sourceDomain: parsed.data.sourceDomain,
      sourceReference: parsed.data.sourceReference,
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      severity: parsed.data.severity ?? "info",
      correlationId: parsed.data.correlationId,
      traceId: parsed.data.traceId,
      idempotencyKey: parsed.data.idempotencyKey,
      payload: parsed.data.payload ?? {},
      metadata: parsed.data.metadata ?? {},
      occurredAt: parsed.data.occurredAt,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

async function handleRequest(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const method = request.method.toUpperCase();
  const rateLimit = enforceRateLimit(request, `pgems-observability-operations-layer-${method.toLowerCase()}`, method === "GET" ? 220 : 140);
  if (rateLimit) return rateLimit;

  if (method !== "GET") {
    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;
  }

  const auth = await ensureAccess(request);
  if (auth instanceof NextResponse) return auth;

  const params = await context.params;
  const segments = params.path ?? [];
  const root = segments[0];
  if (!root) return jsonError("INVALID_PATH", "Missing observability operations path segment", 404);

  if (root === "monitoring") return handleMonitoring(request);
  if (root === "logging") return handleLogging(request);
  if (root === "metrics") return handleMetrics(request);
  if (root === "tracing") return handleTracing(request);
  if (root === "health") return handleHealth(request);
  if (root === "incidents") return handleIncidents(request, auth, segments);
  if (root === "feature-flags") return handleFeatureFlags(request);
  if (root === "configuration") return handleConfiguration(request);
  if (root === "disaster-recovery") return handleDisasterRecovery(request);
  if (root === "performance") return handlePerformance(request);
  if (root === "reliability") return handleReliability(request);
  if (root === "security-operations") return handleSecurityOperations(request);
  if (root === "audit-events") return handleAuditEvents(request, auth);

  return jsonError("INVALID_PATH", `Unknown observability operations path: ${root}`, 404);
}
