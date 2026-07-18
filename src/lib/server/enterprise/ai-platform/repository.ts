import { createSupabaseAdminClient } from "../../supabase.ts";
import { renderPromptVersion } from "./prompts.ts";
import { getProviderAdapter } from "./provider-adapters.ts";
import { selectAiRoute } from "./routing.ts";
import { evaluateAiSafety } from "./safety.ts";
import type {
  AiAuditRecord,
  AiCacheRecord,
  AiFallbackRuleRecord,
  AiModelRecord,
  AiPolicyRecord,
  AiPriority,
  AiPromptRecord,
  AiPromptVersionRecord,
  AiProviderRecord,
  AiRateLimitRecord,
  AiRequestRecord,
  AiResponseRecord,
  AiRoutingRuleRecord,
  AiSafetyRecord,
  AiTaskRecord,
  AiTaskType,
  AiTelemetryRecord,
  AiUsageRecord,
} from "./types.ts";

async function listRows<T>(table: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as T[];
}

async function createRow<T>(table: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data as T;
}

async function updateRow<T>(table: string, filter: Record<string, unknown>, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).update(payload).select("*");
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.single();
  if (error) throw error;
  return data as T;
}

export async function listAiProviders() {
  return listRows<AiProviderRecord>("pgems_ai_providers");
}

export async function createAiProvider(payload: {
  code: string;
  name: string;
  providerKind: AiProviderRecord["provider_kind"];
  region: string;
  complianceTags: string[];
  healthScore: number;
  supportsStreaming: boolean;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiProviderRecord>("pgems_ai_providers", {
    code: payload.code,
    name: payload.name,
    provider_kind: payload.providerKind,
    region: payload.region,
    compliance_tags: payload.complianceTags,
    health_score: payload.healthScore,
    supports_streaming: payload.supportsStreaming,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listAiModels() {
  return listRows<AiModelRecord>("pgems_ai_models");
}

export async function createAiModel(payload: {
  providerId: string;
  code: string;
  name: string;
  modelFamily: string;
  version: string;
  contextWindow: number;
  maxOutputTokens: number;
  latencyTier: AiModelRecord["latency_tier"];
  estimatedCostInputPer1k: number;
  estimatedCostOutputPer1k: number;
  capabilities: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiModelRecord>("pgems_ai_models", {
    provider_id: payload.providerId,
    code: payload.code,
    name: payload.name,
    model_family: payload.modelFamily,
    version: payload.version,
    context_window: payload.contextWindow,
    max_output_tokens: payload.maxOutputTokens,
    latency_tier: payload.latencyTier,
    estimated_cost_input_per_1k: payload.estimatedCostInputPer1k,
    estimated_cost_output_per_1k: payload.estimatedCostOutputPer1k,
    capabilities: payload.capabilities,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listAiPrompts() {
  return listRows<AiPromptRecord>("pgems_ai_prompts");
}

export async function createAiPrompt(payload: {
  code: string;
  name: string;
  taskType: AiTaskType;
  locale: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiPromptRecord>("pgems_ai_prompts", {
    code: payload.code,
    name: payload.name,
    task_type: payload.taskType,
    locale: payload.locale,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listAiPromptVersions() {
  return listRows<AiPromptVersionRecord>("pgems_ai_prompt_versions");
}

export async function createAiPromptVersion(payload: {
  promptId: string;
  versionLabel: string;
  systemPrompt: string;
  developerPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  locale: string;
  metadata: Record<string, unknown>;
  isDefault: boolean;
  isActive: boolean;
}) {
  return createRow<AiPromptVersionRecord>("pgems_ai_prompt_versions", {
    prompt_id: payload.promptId,
    version_label: payload.versionLabel,
    system_prompt: payload.systemPrompt,
    developer_prompt: payload.developerPrompt,
    user_prompt_template: payload.userPromptTemplate,
    variables: payload.variables,
    locale: payload.locale,
    metadata: payload.metadata,
    is_default: payload.isDefault,
    is_active: payload.isActive,
  });
}

export async function listAiPolicies() {
  return listRows<AiPolicyRecord>("pgems_ai_policies");
}

export async function createAiPolicy(payload: {
  code: string;
  name: string;
  taskType?: AiTaskType;
  minAuthorityLevel: number;
  requiresHumanReview: boolean;
  safetyProfile: AiPolicyRecord["safety_profile"];
  rateLimitTier: AiPolicyRecord["rate_limit_tier"];
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiPolicyRecord>("pgems_ai_policies", {
    code: payload.code,
    name: payload.name,
    task_type: payload.taskType ?? null,
    min_authority_level: payload.minAuthorityLevel,
    requires_human_review: payload.requiresHumanReview,
    safety_profile: payload.safetyProfile,
    rate_limit_tier: payload.rateLimitTier,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listAiRoutingRules() {
  return listRows<AiRoutingRuleRecord>("pgems_ai_routing_rules");
}

export async function createAiRoutingRule(payload: {
  code: string;
  name: string;
  taskType: AiTaskType;
  preferredProviderId?: string;
  preferredModelId?: string;
  maxLatencyMs?: number;
  maxEstimatedCost?: number;
  requiredRegion?: string;
  requiredComplianceTags: string[];
  priority: AiPriority;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiRoutingRuleRecord>("pgems_ai_routing_rules", {
    code: payload.code,
    name: payload.name,
    task_type: payload.taskType,
    preferred_provider_id: payload.preferredProviderId ?? null,
    preferred_model_id: payload.preferredModelId ?? null,
    max_latency_ms: payload.maxLatencyMs ?? null,
    max_estimated_cost: payload.maxEstimatedCost ?? null,
    required_region: payload.requiredRegion ?? null,
    required_compliance_tags: payload.requiredComplianceTags,
    priority: payload.priority,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listAiFallbackRules() {
  return listRows<AiFallbackRuleRecord>("pgems_ai_fallback_rules");
}

export async function createAiFallbackRule(payload: {
  code: string;
  name: string;
  taskType: AiTaskType;
  primaryProviderId: string;
  fallbackProviderId: string;
  fallbackModelId?: string;
  triggerReason: AiFallbackRuleRecord["trigger_reason"];
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiFallbackRuleRecord>("pgems_ai_fallback_rules", {
    code: payload.code,
    name: payload.name,
    task_type: payload.taskType,
    primary_provider_id: payload.primaryProviderId,
    fallback_provider_id: payload.fallbackProviderId,
    fallback_model_id: payload.fallbackModelId ?? null,
    trigger_reason: payload.triggerReason,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listAiTasks() {
  return listRows<AiTaskRecord>("pgems_ai_tasks");
}

export async function createAiTask(payload: {
  code: string;
  name: string;
  taskType: AiTaskType;
  promptId?: string;
  policyId?: string;
  routingRuleId?: string;
  fallbackRuleId?: string;
  locale: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiTaskRecord>("pgems_ai_tasks", {
    code: payload.code,
    name: payload.name,
    task_type: payload.taskType,
    prompt_id: payload.promptId ?? null,
    policy_id: payload.policyId ?? null,
    routing_rule_id: payload.routingRuleId ?? null,
    fallback_rule_id: payload.fallbackRuleId ?? null,
    locale: payload.locale,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listAiRequests() {
  return listRows<AiRequestRecord>("pgems_ai_requests");
}

export async function createAiRequest(payload: {
  taskId: string;
  promptVersionId?: string;
  providerId?: string;
  modelId?: string;
  sourceEventId?: string;
  correlationId: string;
  traceId: string;
  inputPayload: Record<string, unknown>;
  inputHash: string;
  locale: string;
  status: AiRequestRecord["status"];
  priority: AiRequestRecord["priority"];
  metadata: Record<string, unknown>;
}) {
  return createRow<AiRequestRecord>("pgems_ai_requests", {
    task_id: payload.taskId,
    prompt_version_id: payload.promptVersionId ?? null,
    provider_id: payload.providerId ?? null,
    model_id: payload.modelId ?? null,
    source_event_id: payload.sourceEventId ?? null,
    correlation_id: payload.correlationId,
    trace_id: payload.traceId,
    input_payload: payload.inputPayload,
    input_hash: payload.inputHash,
    locale: payload.locale,
    status: payload.status,
    priority: payload.priority,
    metadata: payload.metadata,
  });
}

export async function listAiResponses() {
  return listRows<AiResponseRecord>("pgems_ai_responses");
}

export async function createAiResponse(payload: {
  requestId: string;
  providerId?: string;
  modelId?: string;
  responsePayload: Record<string, unknown>;
  outputText: string;
  outputEmbedding: number[];
  tokenInput: number;
  tokenOutput: number;
  estimatedCost: number;
  latencyMs: number;
  status: AiResponseRecord["status"];
  safetyStatus: AiResponseRecord["safety_status"];
  cached: boolean;
  metadata: Record<string, unknown>;
}) {
  return createRow<AiResponseRecord>("pgems_ai_responses", {
    request_id: payload.requestId,
    provider_id: payload.providerId ?? null,
    model_id: payload.modelId ?? null,
    response_payload: payload.responsePayload,
    output_text: payload.outputText,
    output_embedding: payload.outputEmbedding,
    token_input: payload.tokenInput,
    token_output: payload.tokenOutput,
    estimated_cost: payload.estimatedCost,
    latency_ms: payload.latencyMs,
    status: payload.status,
    safety_status: payload.safetyStatus,
    cached: payload.cached,
    metadata: payload.metadata,
  });
}

export async function listAiUsage() {
  return listRows<AiUsageRecord>("pgems_ai_usage");
}

export async function createAiUsage(payload: {
  requestId?: string;
  responseId?: string;
  providerId?: string;
  modelId?: string;
  taskType: AiTaskType;
  usageDate: string;
  tokenInput: number;
  tokenOutput: number;
  estimatedCost: number;
  latencyMs: number;
  metadata: Record<string, unknown>;
}) {
  return createRow<AiUsageRecord>("pgems_ai_usage", {
    request_id: payload.requestId ?? null,
    response_id: payload.responseId ?? null,
    provider_id: payload.providerId ?? null,
    model_id: payload.modelId ?? null,
    task_type: payload.taskType,
    usage_date: payload.usageDate,
    token_input: payload.tokenInput,
    token_output: payload.tokenOutput,
    estimated_cost: payload.estimatedCost,
    latency_ms: payload.latencyMs,
    metadata: payload.metadata,
  });
}

export async function listAiCache() {
  return listRows<AiCacheRecord>("pgems_ai_cache");
}

export async function createAiCacheEntry(payload: {
  cacheKey: string;
  requestHash: string;
  responsePayload: Record<string, unknown>;
  expiresAt: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<AiCacheRecord>("pgems_ai_cache", {
    cache_key: payload.cacheKey,
    request_hash: payload.requestHash,
    response_payload: payload.responsePayload,
    expires_at: payload.expiresAt,
    metadata: payload.metadata,
  });
}

export async function listAiTelemetry() {
  return listRows<AiTelemetryRecord>("pgems_ai_telemetry");
}

export async function createAiTelemetry(payload: {
  requestId?: string;
  responseId?: string;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  dimensions: Record<string, unknown>;
}) {
  return createRow<AiTelemetryRecord>("pgems_ai_telemetry", {
    request_id: payload.requestId ?? null,
    response_id: payload.responseId ?? null,
    metric_name: payload.metricName,
    metric_value: payload.metricValue,
    metric_unit: payload.metricUnit,
    dimensions: payload.dimensions,
  });
}

export async function listAiAudit() {
  return listRows<AiAuditRecord>("pgems_ai_audit");
}

export async function createAiAudit(payload: {
  requestId?: string;
  responseId?: string;
  actionCode: string;
  actorType: AiAuditRecord["actor_type"];
  actorKey: string;
  outcome: AiAuditRecord["outcome"];
  reason?: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<AiAuditRecord>("pgems_ai_audit", {
    request_id: payload.requestId ?? null,
    response_id: payload.responseId ?? null,
    action_code: payload.actionCode,
    actor_type: payload.actorType,
    actor_key: payload.actorKey,
    outcome: payload.outcome,
    reason: payload.reason ?? null,
    metadata: payload.metadata,
  });
}

export async function listAiSafetyChecks() {
  return listRows<AiSafetyRecord>("pgems_ai_safety_checks");
}

export async function createAiSafetyCheck(payload: {
  requestId?: string;
  responseId?: string;
  policyId?: string;
  status: AiSafetyRecord["status"];
  riskScore: number;
  flags: string[];
  explanation?: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<AiSafetyRecord>("pgems_ai_safety_checks", {
    request_id: payload.requestId ?? null,
    response_id: payload.responseId ?? null,
    policy_id: payload.policyId ?? null,
    status: payload.status,
    risk_score: payload.riskScore,
    flags: payload.flags,
    explanation: payload.explanation ?? null,
    metadata: payload.metadata,
  });
}

export async function listAiRateLimits() {
  return listRows<AiRateLimitRecord>("pgems_ai_rate_limits");
}

export async function createAiRateLimit(payload: {
  scopeKey: string;
  taskType?: AiTaskType;
  providerId?: string;
  windowSeconds: number;
  maxRequests: number;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<AiRateLimitRecord>("pgems_ai_rate_limits", {
    scope_key: payload.scopeKey,
    task_type: payload.taskType ?? null,
    provider_id: payload.providerId ?? null,
    window_seconds: payload.windowSeconds,
    max_requests: payload.maxRequests,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function selectAiExecutionRoute(payload: {
  taskType: AiTaskType;
  priority: AiPriority;
  requiredRegion?: string;
  requiredComplianceTags: string[];
}) {
  const [providers, routingRules, fallbackRules] = await Promise.all([
    listAiProviders(),
    listAiRoutingRules(),
    listAiFallbackRules(),
  ]);

  const routingRule =
    routingRules.find((rule) => rule.task_type === payload.taskType && rule.priority === payload.priority && rule.is_active) ??
    routingRules.find((rule) => rule.task_type === payload.taskType && rule.is_active) ??
    null;

  const fallbackRule =
    fallbackRules.find((rule) => rule.task_type === payload.taskType && rule.is_active) ?? null;

  return selectAiRoute({
    providers,
    routingRule,
    fallbackRule,
    requiredRegion: payload.requiredRegion,
    requiredComplianceTags: payload.requiredComplianceTags,
  });
}

export async function renderAiPrompt(payload: {
  promptVersionId: string;
  variables: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_ai_prompt_versions")
    .select("*")
    .eq("id", payload.promptVersionId)
    .single();

  if (error) throw error;

  return renderPromptVersion(data as AiPromptVersionRecord, payload.variables);
}

export async function executeAiTaskFoundation(payload: {
  taskId: string;
  requestId: string;
  dryRun: boolean;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: task, error: taskError } = await supabase
    .from("pgems_ai_tasks")
    .select("*")
    .eq("id", payload.taskId)
    .single();
  if (taskError) throw taskError;

  const { data: request, error: requestError } = await supabase
    .from("pgems_ai_requests")
    .select("*")
    .eq("id", payload.requestId)
    .single();
  if (requestError) throw requestError;

  const [policy, promptVersion] = await Promise.all([
    task.policy_id
      ? supabase.from("pgems_ai_policies").select("*").eq("id", task.policy_id).maybeSingle().then((res) => res.data as AiPolicyRecord | null)
      : Promise.resolve(null),
    request.prompt_version_id
      ? supabase.from("pgems_ai_prompt_versions").select("*").eq("id", request.prompt_version_id).maybeSingle().then((res) => res.data as AiPromptVersionRecord | null)
      : Promise.resolve(null),
  ]);

  const route = await selectAiExecutionRoute({
    taskType: task.task_type,
    priority: request.priority,
    requiredRegion: undefined,
    requiredComplianceTags: [],
  });

  const provider = route.selectedProviderId
    ? await supabase.from("pgems_ai_providers").select("*").eq("id", route.selectedProviderId).maybeSingle().then((res) => res.data as AiProviderRecord | null)
    : null;

  const model = route.selectedModelId
    ? await supabase.from("pgems_ai_models").select("*").eq("id", route.selectedModelId).maybeSingle().then((res) => res.data as AiModelRecord | null)
    : null;

  const rendered = promptVersion
    ? renderPromptVersion(promptVersion, {
        input: request.input_payload,
        metadata: request.metadata,
      })
    : {
        systemPrompt: "",
        developerPrompt: "",
        userPrompt: JSON.stringify(request.input_payload ?? {}),
        locale: request.locale,
      };

  const riskScore = 0;
  const safety = evaluateAiSafety({
    policy,
    authorityLevel: 100,
    riskScore,
  });

  if (payload.dryRun) {
    await createAiAudit({
      requestId: request.id,
      actionCode: "execute_task_dry_run",
      actorType: "system",
      actorKey: "ai_platform",
      outcome: "success",
      reason: "Dry run completed",
      metadata: {
        route,
        safety,
      },
    });

    return {
      dryRun: true,
      route,
      safety,
      rendered,
    };
  }

  if (safety.status === "blocked") {
    await updateRow<AiRequestRecord>("pgems_ai_requests", { id: request.id }, { status: "failed" });
    await createAiSafetyCheck({
      requestId: request.id,
      policyId: policy?.id,
      status: "blocked",
      riskScore,
      flags: ["policy_block"],
      explanation: safety.reason,
      metadata: {},
    });

    await createAiAudit({
      requestId: request.id,
      actionCode: "execute_task_blocked",
      actorType: "system",
      actorKey: "ai_platform",
      outcome: "failure",
      reason: safety.reason,
      metadata: { route },
    });

    return {
      dryRun: false,
      blocked: true,
      reason: safety.reason,
      route,
      safety,
    };
  }

  const adapter = getProviderAdapter(provider?.provider_kind ?? "future");
  const output = await adapter.run({
    modelCode: model?.code ?? "generic-foundation-model",
    systemPrompt: rendered.systemPrompt,
    developerPrompt: rendered.developerPrompt,
    userPrompt: rendered.userPrompt,
    variables: {
      input: request.input_payload,
      metadata: request.metadata,
    },
    metadata: {},
  });

  const response = await createAiResponse({
    requestId: request.id,
    providerId: provider?.id,
    modelId: model?.id,
    responsePayload: {
      text: output.outputText,
      embedding: output.outputEmbedding,
    },
    outputText: output.outputText,
    outputEmbedding: output.outputEmbedding,
    tokenInput: output.tokenInput,
    tokenOutput: output.tokenOutput,
    estimatedCost: output.estimatedCost,
    latencyMs: output.latencyMs,
    status: "success",
    safetyStatus: safety.status,
    cached: false,
    metadata: output.metadata,
  });

  await updateRow<AiRequestRecord>("pgems_ai_requests", { id: request.id }, { status: "completed" });

  await Promise.all([
    createAiUsage({
      requestId: request.id,
      responseId: response.id,
      providerId: provider?.id,
      modelId: model?.id,
      taskType: task.task_type,
      usageDate: new Date().toISOString().slice(0, 10),
      tokenInput: output.tokenInput,
      tokenOutput: output.tokenOutput,
      estimatedCost: output.estimatedCost,
      latencyMs: output.latencyMs,
      metadata: {},
    }),
    createAiTelemetry({
      requestId: request.id,
      responseId: response.id,
      metricName: "latency_ms",
      metricValue: output.latencyMs,
      metricUnit: "ms",
      dimensions: {
        taskType: task.task_type,
      },
    }),
    createAiSafetyCheck({
      requestId: request.id,
      responseId: response.id,
      policyId: policy?.id,
      status: safety.status,
      riskScore,
      flags: [],
      explanation: safety.reason,
      metadata: {},
    }),
    createAiAudit({
      requestId: request.id,
      responseId: response.id,
      actionCode: "execute_task",
      actorType: "system",
      actorKey: "ai_platform",
      outcome: "success",
      reason: "Task executed via simulated provider adapter",
      metadata: {
        route,
      },
    }),
  ]);

  return {
    dryRun: false,
    response,
    route,
    safety,
  };
}

export async function publishAiPlatformEvent(payload: {
  eventTypeId: string;
  categoryId: string;
  channelId: string;
  publisherId: string;
  queueId: string;
  kind: "domain" | "system" | "business";
  priority: AiPriority;
  status: "created" | "queued" | "processing" | "delivered" | "failed" | "cancelled" | "retried" | "archived";
  correlationId: string;
  traceId: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  maxRetryCount: number;
}) {
  const event = await createRow<{ id: string; status: string }>("pgems_events", {
    event_type_id: payload.eventTypeId,
    category_id: payload.categoryId,
    channel_id: payload.channelId,
    publisher_id: payload.publisherId,
    queue_id: payload.queueId,
    kind: payload.kind,
    status: payload.status,
    priority: payload.priority,
    correlation_id: payload.correlationId,
    trace_id: payload.traceId,
    idempotency_key: payload.idempotencyKey,
    payload: payload.payload,
    metadata: payload.metadata,
    retry_count: 0,
    max_retry_count: payload.maxRetryCount,
    available_at: new Date().toISOString(),
  });

  await createAiAudit({
    actionCode: "publish_event",
    actorType: "system",
    actorKey: "ai_platform",
    outcome: "success",
    reason: "AI platform published event to enterprise event engine",
    metadata: {
      eventId: event.id,
      status: event.status,
    },
  });

  return event;
}

export async function consumeEventForAiPlatform(payload: {
  eventId: string;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("pgems_events").select("*").eq("id", payload.eventId).single();
  if (error) throw error;

  await createAiAudit({
    actionCode: "consume_event",
    actorType: "system",
    actorKey: "ai_platform",
    outcome: "success",
    reason: "AI platform consumed event from enterprise event engine",
    metadata: {
      eventId: payload.eventId,
      consumeMetadata: payload.metadata,
    },
  });

  return data;
}
