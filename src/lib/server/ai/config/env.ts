import { readOptionalEnv } from "../../config/env.ts";
import type { AiProviderName } from "../contracts/types.ts";

interface AiEngineConfig {
  enabled: boolean;
  useDbPolicies: boolean;
  defaultProvider: AiProviderName;
  externalProvidersEnabled: boolean;
  localOnlyMode: boolean;
  failClosedForHighSensitivity: boolean;
  defaultTimeoutMs: number;
}

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readBooleanEnv(key: string, fallback: boolean): boolean {
  const value = readOptionalEnv(key);
  if (!value) return fallback;
  return TRUE_VALUES.has(value.toLowerCase());
}

function readNumberEnv(key: string, fallback: number): number {
  const value = readOptionalEnv(key);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function readProviderEnv(key: string, fallback: AiProviderName): AiProviderName {
  const value = readOptionalEnv(key);
  const allowed = new Set<AiProviderName>([
    "openai",
    "anthropic_claude",
    "google_gemini",
    "azure_openai",
    "deepseek",
    "local_llm",
    "mock",
  ]);

  if (!value) return fallback;
  return allowed.has(value as AiProviderName) ? (value as AiProviderName) : fallback;
}

export function readAiEngineConfig(): AiEngineConfig {
  return {
    enabled: readBooleanEnv("AI_ENGINE_ENABLED", false),
    useDbPolicies: readBooleanEnv("AI_ENGINE_USE_DB_POLICIES", false),
    defaultProvider: readProviderEnv("AI_ENGINE_DEFAULT_PROVIDER", "mock"),
    externalProvidersEnabled: readBooleanEnv("AI_ENGINE_EXTERNAL_PROVIDERS_ENABLED", false),
    localOnlyMode: readBooleanEnv("AI_ENGINE_LOCAL_ONLY_MODE", true),
    failClosedForHighSensitivity: readBooleanEnv("AI_ENGINE_FAIL_CLOSED_FOR_HIGH_SENSITIVITY", true),
    defaultTimeoutMs: readNumberEnv("AI_ENGINE_DEFAULT_TIMEOUT_MS", 15000),
  };
}

const SECRET_PATTERN = /(api[_-]?key|token|secret|password)/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const URL_PATTERN = /https?:\/\/\S+/gi;

export function redactForLogs(value: string): string {
  return value
    .replace(SECRET_PATTERN, "[redacted-secret]")
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(PHONE_PATTERN, "[redacted-phone]")
    .replace(URL_PATTERN, "[redacted-url]");
}

export type { AiEngineConfig };