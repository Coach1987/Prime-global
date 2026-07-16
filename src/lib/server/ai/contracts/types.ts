export type AiTaskType =
  | "cv_extract"
  | "profile_rewrite"
  | "recommendations"
  | "matching_explanation"
  | "skill_normalization"
  | "pii_detection"
  | "employer_summary"
  | "candidate_rescoring";

export type AiProviderName =
  | "openai"
  | "anthropic_claude"
  | "google_gemini"
  | "azure_openai"
  | "deepseek"
  | "local_llm"
  | "mock";

export type AiCapability = "generate_text" | "generate_json" | "embed" | "classify" | "health_check";

export type AiPiiSensitivity = "low" | "medium" | "high" | "restricted";

export interface AiPromptRef {
  id: string;
  version: string;
}

export interface AiExecutionContext {
  requestId: string;
  correlationId?: string;
  actorType: "candidate" | "employer" | "prime_staff" | "system";
  actorId?: string;
  locale?: "en" | "ar";
  region?: string;
  environment: "development" | "staging" | "production" | "test";
  featureFlags?: Record<string, boolean>;
  policyVersion?: string;
}

export interface AiRequest {
  taskType: AiTaskType;
  capability: Extract<AiCapability, "generate_text" | "generate_json" | "embed" | "classify">;
  prompt?: string;
  promptRef: AiPromptRef;
  inputText?: string;
  inputTexts?: string[];
  labels?: string[];
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  piiSensitivity: AiPiiSensitivity;
  allowExternalProviders: boolean;
  metadata?: Record<string, string | number | boolean | null>;
  context: AiExecutionContext;
}

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  estimatedCostUsd?: number;
  retriesUsed: number;
  fallbackDepth: number;
}

export interface AiError {
  code:
    | "AI_TIMEOUT"
    | "AI_RATE_LIMIT"
    | "AI_UNAVAILABLE"
    | "AI_UNSUPPORTED_CAPABILITY"
    | "AI_POLICY_BLOCKED"
    | "AI_INVALID_RESPONSE"
    | "AI_SCHEMA_VALIDATION_FAILED"
    | "AI_PROVIDER_ERROR"
    | "AI_CIRCUIT_OPEN"
    | "AI_CONFIGURATION_ERROR";
  message: string;
  provider?: AiProviderName;
  retriable: boolean;
  statusCode?: number;
  safeDetails?: Record<string, string | number | boolean | null>;
}

export interface AiFieldConfidence {
  fieldPath: string;
  confidence: number;
  source: "ai" | "candidate_edit" | "prime_edit";
}

export interface AiMatchFactor {
  factor: string;
  weight: number;
  contribution: number;
  reason?: string;
}

export interface AiResponseMetadata {
  provider: AiProviderName;
  model: string;
  promptRef: AiPromptRef;
  fieldConfidence?: AiFieldConfidence[];
  matchFactors?: AiMatchFactor[];
}

export interface AiResponse<TJson = Record<string, unknown>> {
  ok: boolean;
  provider: AiProviderName;
  model: string;
  capability: AiCapability;
  taskType: AiTaskType;
  text?: string;
  json?: TJson;
  embedding?: number[];
  classification?: {
    label: string;
    score: number;
    labels?: Array<{ label: string; score: number }>;
  };
  usage: AiUsage;
  metadata: AiResponseMetadata;
  error?: AiError;
  warnings?: string[];
}

export interface AiTaskPolicy {
  taskType: AiTaskType;
  requiredCapability: AiCapability;
  primaryProvider: AiProviderName;
  fallbackChain: AiProviderName[];
  modelClass: "nano" | "mini" | "standard" | "reasoning" | "embedding";
  temperature: number;
  timeoutMs: number;
  retryCount: number;
  requireJson: boolean;
  piiSensitivity: AiPiiSensitivity;
  allowExternalProviders: boolean;
  localLlmPreference: "optional" | "preferred" | "mandatory";
  enabled: boolean;
  policyVersion: string;
}

export interface AiFallbackPolicy {
  taskType: AiTaskType;
  maxFallbackDepth: number;
  stopOnPolicyBlock: boolean;
  stopOnSchemaFailure: boolean;
  allowProviderReuseAfterRateLimit: boolean;
  allowExternalFallbackForHighSensitivity: boolean;
  order: AiProviderName[];
}

export interface AiTelemetryRecord {
  timestamp: string;
  requestId: string;
  correlationId?: string;
  taskType: AiTaskType;
  capability: AiCapability;
  provider: AiProviderName;
  model: string;
  success: boolean;
  errorCode?: AiError["code"];
  statusCode?: number;
  retriesUsed: number;
  fallbackDepth: number;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  piiSensitivity: AiPiiSensitivity;
  policyVersion: string;
  redactionApplied: boolean;
  promptRef: AiPromptRef;
}

export interface AiProviderAdapter {
  readonly provider: AiProviderName;
  readonly capabilities: AiCapability[];
  generateText(request: AiRequest): Promise<AiResponse>;
  generateJson<TJson = Record<string, unknown>>(request: AiRequest): Promise<AiResponse<TJson>>;
  embed(request: AiRequest): Promise<AiResponse>;
  classify(request: AiRequest): Promise<AiResponse>;
  healthCheck(context: AiExecutionContext): Promise<{
    ok: boolean;
    provider: AiProviderName;
    latencyMs: number;
    details?: Record<string, string | number | boolean | null>;
  }>;
}