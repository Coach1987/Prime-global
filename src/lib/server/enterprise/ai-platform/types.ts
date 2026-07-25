export type AiProviderKind = "openai" | "anthropic" | "google_gemini" | "azure_openai" | "deepseek" | "local_llm" | "future";
export type AiTaskType =
  | "classification"
  | "extraction"
  | "summarization"
  | "matching"
  | "recommendation"
  | "translation"
  | "reasoning"
  | "scoring"
  | "ranking"
  | "moderation"
  | "embeddings"
  | "custom";
export type AiPriority = "low" | "normal" | "high" | "critical" | "emergency";
export type AiRequestStatus = "created" | "routed" | "queued" | "processing" | "completed" | "failed" | "cancelled";
export type AiResponseStatus = "success" | "partial" | "failed" | "blocked" | "cached";
export type AiSafetyStatus = "pending" | "passed" | "blocked" | "needs_review";

export interface AiProviderRecord {
  id: string;
  code: string;
  name: string;
  provider_kind: AiProviderKind;
  region: string;
  compliance_tags: string[];
  health_score: number;
  supports_streaming: boolean;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiModelRecord {
  id: string;
  provider_id: string;
  code: string;
  name: string;
  model_family: string;
  version: string;
  context_window: number;
  max_output_tokens: number;
  latency_tier: "low" | "standard" | "high";
  estimated_cost_input_per_1k: number;
  estimated_cost_output_per_1k: number;
  capabilities: string[];
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiPromptRecord {
  id: string;
  code: string;
  name: string;
  task_type: AiTaskType;
  locale: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiPromptVersionRecord {
  id: string;
  prompt_id: string;
  version_label: string;
  system_prompt: string;
  developer_prompt: string;
  user_prompt_template: string;
  variables: string[];
  locale: string;
  metadata: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiPolicyRecord {
  id: string;
  code: string;
  name: string;
  task_type: AiTaskType | null;
  min_authority_level: number;
  requires_human_review: boolean;
  safety_profile: "standard" | "strict" | "sensitive";
  rate_limit_tier: "default" | "elevated" | "critical";
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiRoutingRuleRecord {
  id: string;
  code: string;
  name: string;
  task_type: AiTaskType;
  preferred_provider_id: string | null;
  preferred_model_id: string | null;
  max_latency_ms: number | null;
  max_estimated_cost: number | null;
  required_region: string | null;
  required_compliance_tags: string[];
  priority: AiPriority;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiFallbackRuleRecord {
  id: string;
  code: string;
  name: string;
  task_type: AiTaskType;
  primary_provider_id: string;
  fallback_provider_id: string;
  fallback_model_id: string | null;
  trigger_reason: "provider_down" | "timeout" | "cost_limit" | "rate_limited" | "safety_block" | "manual";
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiTaskRecord {
  id: string;
  code: string;
  name: string;
  task_type: AiTaskType;
  prompt_id: string | null;
  policy_id: string | null;
  routing_rule_id: string | null;
  fallback_rule_id: string | null;
  locale: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiRequestRecord {
  id: string;
  task_id: string;
  prompt_version_id: string | null;
  provider_id: string | null;
  model_id: string | null;
  source_event_id: string | null;
  correlation_id: string;
  trace_id: string;
  input_payload: Record<string, unknown>;
  input_hash: string;
  locale: string;
  status: AiRequestStatus;
  priority: AiPriority;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AiResponseRecord {
  id: string;
  request_id: string;
  provider_id: string | null;
  model_id: string | null;
  response_payload: Record<string, unknown>;
  output_text: string;
  output_embedding: number[];
  token_input: number;
  token_output: number;
  estimated_cost: number;
  latency_ms: number;
  status: AiResponseStatus;
  safety_status: AiSafetyStatus;
  cached: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiUsageRecord {
  id: string;
  request_id: string | null;
  response_id: string | null;
  provider_id: string | null;
  model_id: string | null;
  task_type: AiTaskType;
  usage_date: string;
  token_input: number;
  token_output: number;
  estimated_cost: number;
  latency_ms: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiCacheRecord {
  id: string;
  cache_key: string;
  request_hash: string;
  response_payload: Record<string, unknown>;
  expires_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiTelemetryRecord {
  id: string;
  request_id: string | null;
  response_id: string | null;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  dimensions: Record<string, unknown>;
  created_at: string;
}

export interface AiAuditRecord {
  id: string;
  request_id: string | null;
  response_id: string | null;
  action_code: string;
  actor_type: "user" | "system" | "service";
  actor_key: string;
  outcome: "success" | "failure" | "manual_review";
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiSafetyRecord {
  id: string;
  request_id: string | null;
  response_id: string | null;
  policy_id: string | null;
  status: AiSafetyStatus;
  risk_score: number;
  flags: string[];
  explanation: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiRateLimitRecord {
  id: string;
  scope_key: string;
  task_type: AiTaskType | null;
  provider_id: string | null;
  window_seconds: number;
  max_requests: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiSelectedRoute {
  selectedProviderId: string | null;
  selectedModelId: string | null;
  reason: string;
  fallbackProviderId: string | null;
}

export interface AiRenderedPrompt {
  systemPrompt: string;
  developerPrompt: string;
  userPrompt: string;
  locale: string;
}

export interface AiProviderAdapterInput {
  modelCode: string;
  systemPrompt: string;
  developerPrompt: string;
  userPrompt: string;
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface AiProviderAdapterResult {
  outputText: string;
  outputEmbedding: number[];
  tokenInput: number;
  tokenOutput: number;
  estimatedCost: number;
  latencyMs: number;
  metadata: Record<string, unknown>;
}

export interface AiProviderAdapter {
  provider: AiProviderKind;
  run(input: AiProviderAdapterInput): Promise<AiProviderAdapterResult>;
}
