import { NextResponse } from "next/server";
import {
  consumeAiEventSchema,
  createAiAuditSchema,
  createAiCacheEntrySchema,
  createAiFallbackRuleSchema,
  createAiModelSchema,
  createAiPolicySchema,
  createAiPromptSchema,
  createAiPromptVersionSchema,
  createAiProviderSchema,
  createAiRateLimitSchema,
  createAiRequestSchema,
  createAiResponseSchema,
  createAiRoutingRuleSchema,
  createAiSafetyCheckSchema,
  createAiTaskSchema,
  createAiTelemetrySchema,
  createAiUsageSchema,
  executeAiTaskSchema,
  publishAiEventSchema,
  renderPromptSchema,
  selectAiRouteSchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  consumeEventForAiPlatform,
  createAiAudit,
  createAiCacheEntry,
  createAiFallbackRule,
  createAiModel,
  createAiPolicy,
  createAiPrompt,
  createAiPromptVersion,
  createAiProvider,
  createAiRateLimit,
  createAiRequest,
  createAiResponse,
  createAiRoutingRule,
  createAiSafetyCheck,
  createAiTask,
  createAiTelemetry,
  createAiUsage,
  executeAiTaskFoundation,
  listAiAudit,
  listAiCache,
  listAiFallbackRules,
  listAiModels,
  listAiPolicies,
  listAiPromptVersions,
  listAiPrompts,
  listAiProviders,
  listAiRateLimits,
  listAiRequests,
  listAiResponses,
  listAiRoutingRules,
  listAiSafetyChecks,
  listAiTasks,
  listAiTelemetry,
  listAiUsage,
  publishAiPlatformEvent,
  renderAiPrompt,
  selectAiExecutionRoute,
} from "../../../../../lib/server/enterprise/ai-platform/index";
import { requireAiPlatformAccess } from "../_shared.ts";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function ensureAccess(request: Request) {
  const auth = await requireAiPlatformAccess(request);
  if (auth instanceof NextResponse) return auth;
  return null;
}

async function handleProviders(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiProviders() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiProviderSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiProvider({
      code: parsed.data.code,
      name: parsed.data.name,
      providerKind: parsed.data.providerKind,
      region: parsed.data.region ?? "global",
      complianceTags: parsed.data.complianceTags ?? [],
      healthScore: parsed.data.healthScore ?? 100,
      supportsStreaming: parsed.data.supportsStreaming ?? false,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleModels(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiModels() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiModelSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiModel({
      providerId: parsed.data.providerId,
      code: parsed.data.code,
      name: parsed.data.name,
      modelFamily: parsed.data.modelFamily,
      version: parsed.data.version,
      contextWindow: parsed.data.contextWindow ?? 8192,
      maxOutputTokens: parsed.data.maxOutputTokens ?? 1024,
      latencyTier: parsed.data.latencyTier ?? "standard",
      estimatedCostInputPer1k: parsed.data.estimatedCostInputPer1k ?? 0,
      estimatedCostOutputPer1k: parsed.data.estimatedCostOutputPer1k ?? 0,
      capabilities: parsed.data.capabilities ?? [],
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePrompts(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      return NextResponse.json({ success: true, data: await listAiPrompts() });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createAiPromptSchema);
      if (parsed.error) return parsed.error;

      const data = await createAiPrompt({
        code: parsed.data.code,
        name: parsed.data.name,
        taskType: parsed.data.taskType,
        locale: parsed.data.locale ?? "en",
        metadata: parsed.data.metadata ?? {},
        isActive: parsed.data.isActive ?? true,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 2 && segments[1] === "render" && request.method === "POST") {
    const parsed = await parseJsonBody(request, renderPromptSchema);
    if (parsed.error) return parsed.error;
    const data = await renderAiPrompt({
      promptVersionId: parsed.data.promptVersionId,
      variables: parsed.data.variables ?? {},
    });
    return NextResponse.json({ success: true, data });
  }

  return jsonError("AI_PLATFORM_NOT_FOUND", "AI prompt endpoint not found", 404);
}

async function handlePromptVersions(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiPromptVersions() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiPromptVersionSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiPromptVersion({
      promptId: parsed.data.promptId,
      versionLabel: parsed.data.versionLabel,
      systemPrompt: parsed.data.systemPrompt,
      developerPrompt: parsed.data.developerPrompt ?? "",
      userPromptTemplate: parsed.data.userPromptTemplate,
      variables: parsed.data.variables ?? [],
      locale: parsed.data.locale ?? "en",
      metadata: parsed.data.metadata ?? {},
      isDefault: parsed.data.isDefault ?? false,
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePolicies(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiPolicies() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiPolicySchema);
    if (parsed.error) return parsed.error;

    const data = await createAiPolicy({
      code: parsed.data.code,
      name: parsed.data.name,
      taskType: parsed.data.taskType,
      minAuthorityLevel: parsed.data.minAuthorityLevel ?? 0,
      requiresHumanReview: parsed.data.requiresHumanReview ?? false,
      safetyProfile: parsed.data.safetyProfile ?? "standard",
      rateLimitTier: parsed.data.rateLimitTier ?? "default",
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleRoutingRules(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      return NextResponse.json({ success: true, data: await listAiRoutingRules() });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createAiRoutingRuleSchema);
      if (parsed.error) return parsed.error;

      const data = await createAiRoutingRule({
        code: parsed.data.code,
        name: parsed.data.name,
        taskType: parsed.data.taskType,
        preferredProviderId: parsed.data.preferredProviderId,
        preferredModelId: parsed.data.preferredModelId,
        maxLatencyMs: parsed.data.maxLatencyMs,
        maxEstimatedCost: parsed.data.maxEstimatedCost,
        requiredRegion: parsed.data.requiredRegion,
        requiredComplianceTags: parsed.data.requiredComplianceTags ?? [],
        priority: parsed.data.priority ?? "normal",
        metadata: parsed.data.metadata ?? {},
        isActive: parsed.data.isActive ?? true,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 2 && segments[1] === "select" && request.method === "POST") {
    const parsed = await parseJsonBody(request, selectAiRouteSchema);
    if (parsed.error) return parsed.error;

    const data = await selectAiExecutionRoute({
      taskType: parsed.data.taskType,
      priority: parsed.data.priority ?? "normal",
      requiredRegion: parsed.data.requiredRegion,
      requiredComplianceTags: parsed.data.requiredComplianceTags ?? [],
    });

    return NextResponse.json({ success: true, data });
  }

  return jsonError("AI_PLATFORM_NOT_FOUND", "AI routing endpoint not found", 404);
}

async function handleFallbackRules(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiFallbackRules() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiFallbackRuleSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiFallbackRule({
      code: parsed.data.code,
      name: parsed.data.name,
      taskType: parsed.data.taskType,
      primaryProviderId: parsed.data.primaryProviderId,
      fallbackProviderId: parsed.data.fallbackProviderId,
      fallbackModelId: parsed.data.fallbackModelId,
      triggerReason: parsed.data.triggerReason ?? "provider_down",
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTasks(request: Request, segments: string[]) {
  if (segments.length === 1) {
    if (request.method === "GET") {
      return NextResponse.json({ success: true, data: await listAiTasks() });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createAiTaskSchema);
      if (parsed.error) return parsed.error;

      const data = await createAiTask({
        code: parsed.data.code,
        name: parsed.data.name,
        taskType: parsed.data.taskType,
        promptId: parsed.data.promptId,
        policyId: parsed.data.policyId,
        routingRuleId: parsed.data.routingRuleId,
        fallbackRuleId: parsed.data.fallbackRuleId,
        locale: parsed.data.locale ?? "en",
        metadata: parsed.data.metadata ?? {},
        isActive: parsed.data.isActive ?? true,
      });

      return NextResponse.json({ success: true, data }, { status: 201 });
    }
  }

  if (segments.length === 2 && segments[1] === "execute" && request.method === "POST") {
    const parsed = await parseJsonBody(request, executeAiTaskSchema);
    if (parsed.error) return parsed.error;

    const data = await executeAiTaskFoundation({
      taskId: parsed.data.taskId,
      requestId: parsed.data.requestId,
      dryRun: parsed.data.dryRun ?? false,
    });

    return NextResponse.json({ success: true, data });
  }

  return jsonError("AI_PLATFORM_NOT_FOUND", "AI task endpoint not found", 404);
}

async function handleRequests(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiRequests() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiRequestSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiRequest({
      taskId: parsed.data.taskId,
      promptVersionId: parsed.data.promptVersionId,
      providerId: parsed.data.providerId,
      modelId: parsed.data.modelId,
      sourceEventId: parsed.data.sourceEventId,
      correlationId: parsed.data.correlationId,
      traceId: parsed.data.traceId,
      inputPayload: parsed.data.inputPayload ?? {},
      inputHash: parsed.data.inputHash,
      locale: parsed.data.locale ?? "en",
      status: parsed.data.status ?? "created",
      priority: parsed.data.priority ?? "normal",
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleResponses(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiResponses() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiResponseSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiResponse({
      requestId: parsed.data.requestId,
      providerId: parsed.data.providerId,
      modelId: parsed.data.modelId,
      responsePayload: parsed.data.responsePayload ?? {},
      outputText: parsed.data.outputText ?? "",
      outputEmbedding: parsed.data.outputEmbedding ?? [],
      tokenInput: parsed.data.tokenInput ?? 0,
      tokenOutput: parsed.data.tokenOutput ?? 0,
      estimatedCost: parsed.data.estimatedCost ?? 0,
      latencyMs: parsed.data.latencyMs ?? 0,
      status: parsed.data.status ?? "success",
      safetyStatus: parsed.data.safetyStatus ?? "pending",
      cached: parsed.data.cached ?? false,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleUsage(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiUsage() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiUsageSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiUsage({
      requestId: parsed.data.requestId,
      responseId: parsed.data.responseId,
      providerId: parsed.data.providerId,
      modelId: parsed.data.modelId,
      taskType: parsed.data.taskType,
      usageDate: parsed.data.usageDate,
      tokenInput: parsed.data.tokenInput ?? 0,
      tokenOutput: parsed.data.tokenOutput ?? 0,
      estimatedCost: parsed.data.estimatedCost ?? 0,
      latencyMs: parsed.data.latencyMs ?? 0,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleCache(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiCache() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiCacheEntrySchema);
    if (parsed.error) return parsed.error;

    const data = await createAiCacheEntry({
      cacheKey: parsed.data.cacheKey,
      requestHash: parsed.data.requestHash,
      responsePayload: parsed.data.responsePayload ?? {},
      expiresAt: parsed.data.expiresAt,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTelemetry(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiTelemetry() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiTelemetrySchema);
    if (parsed.error) return parsed.error;

    const data = await createAiTelemetry({
      requestId: parsed.data.requestId,
      responseId: parsed.data.responseId,
      metricName: parsed.data.metricName,
      metricValue: parsed.data.metricValue,
      metricUnit: parsed.data.metricUnit ?? "count",
      dimensions: parsed.data.dimensions ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleAudit(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiAudit() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiAuditSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiAudit({
      requestId: parsed.data.requestId,
      responseId: parsed.data.responseId,
      actionCode: parsed.data.actionCode,
      actorType: parsed.data.actorType ?? "system",
      actorKey: parsed.data.actorKey,
      outcome: parsed.data.outcome ?? "success",
      reason: parsed.data.reason,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSafety(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiSafetyChecks() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiSafetyCheckSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiSafetyCheck({
      requestId: parsed.data.requestId,
      responseId: parsed.data.responseId,
      policyId: parsed.data.policyId,
      status: parsed.data.status,
      riskScore: parsed.data.riskScore ?? 0,
      flags: parsed.data.flags ?? [],
      explanation: parsed.data.explanation,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleRateLimits(request: Request) {
  if (request.method === "GET") {
    return NextResponse.json({ success: true, data: await listAiRateLimits() });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAiRateLimitSchema);
    if (parsed.error) return parsed.error;

    const data = await createAiRateLimit({
      scopeKey: parsed.data.scopeKey,
      taskType: parsed.data.taskType,
      providerId: parsed.data.providerId,
      windowSeconds: parsed.data.windowSeconds ?? 60,
      maxRequests: parsed.data.maxRequests ?? 60,
      metadata: parsed.data.metadata ?? {},
      isActive: parsed.data.isActive ?? true,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("AI_PLATFORM_METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleEvents(request: Request, segments: string[]) {
  if (segments.length === 2 && segments[1] === "publish" && request.method === "POST") {
    const parsed = await parseJsonBody(request, publishAiEventSchema);
    if (parsed.error) return parsed.error;

    const data = await publishAiPlatformEvent({
      eventTypeId: parsed.data.eventTypeId,
      categoryId: parsed.data.categoryId,
      channelId: parsed.data.channelId,
      publisherId: parsed.data.publisherId,
      queueId: parsed.data.queueId,
      kind: parsed.data.kind ?? "system",
      priority: parsed.data.priority ?? "normal",
      status: parsed.data.status ?? "queued",
      correlationId: parsed.data.correlationId,
      traceId: parsed.data.traceId,
      idempotencyKey: parsed.data.idempotencyKey,
      payload: parsed.data.payload ?? {},
      metadata: parsed.data.metadata ?? {},
      maxRetryCount: parsed.data.maxRetryCount ?? 5,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (segments.length === 2 && segments[1] === "consume" && request.method === "POST") {
    const parsed = await parseJsonBody(request, consumeAiEventSchema);
    if (parsed.error) return parsed.error;

    const data = await consumeEventForAiPlatform({
      eventId: parsed.data.eventId,
      metadata: parsed.data.metadata ?? {},
    });

    return NextResponse.json({ success: true, data });
  }

  return jsonError("AI_PLATFORM_NOT_FOUND", "AI event endpoint not found", 404);
}

async function dispatch(request: Request, segments: string[]) {
  const root = segments[0];

  if (root === "ai-providers") return handleProviders(request);
  if (root === "ai-models") return handleModels(request);
  if (root === "ai-prompts") return handlePrompts(request, segments);
  if (root === "ai-prompt-versions") return handlePromptVersions(request);
  if (root === "ai-policies") return handlePolicies(request);
  if (root === "ai-routing-rules") return handleRoutingRules(request, segments);
  if (root === "ai-fallback-rules") return handleFallbackRules(request);
  if (root === "ai-tasks") return handleTasks(request, segments);
  if (root === "ai-requests") return handleRequests(request);
  if (root === "ai-responses") return handleResponses(request);
  if (root === "ai-usage") return handleUsage(request);
  if (root === "ai-cache") return handleCache(request);
  if (root === "ai-telemetry") return handleTelemetry(request);
  if (root === "ai-audit") return handleAudit(request);
  if (root === "ai-safety-checks") return handleSafety(request);
  if (root === "ai-rate-limits") return handleRateLimits(request);
  if (root === "ai-events") return handleEvents(request, segments);

  return jsonError("AI_PLATFORM_NOT_FOUND", "AI platform endpoint not found", 404);
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-ai-platform-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return jsonError("AI_PLATFORM_NOT_FOUND", "AI platform root requires resource path", 404);
  }

  return dispatch(request, segments);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-ai-platform-post", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const access = await ensureAccess(request);
  if (access) return access;

  const { path } = await params;
  const segments = path.filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return jsonError("AI_PLATFORM_NOT_FOUND", "AI platform root requires resource path", 404);
  }

  return dispatch(request, segments);
}
