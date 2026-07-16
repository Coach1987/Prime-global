import { createAiError } from "../contracts/errors.ts";
import type { AiProviderName, AiTaskPolicy, AiTaskType, AiPiiSensitivity } from "../contracts/types.ts";
import { readAiEngineConfig } from "../config/env.ts";
import { DEFAULT_TASK_POLICIES } from "../policies/task-policies.ts";

function isHighSensitivity(level: AiPiiSensitivity) {
  return level === "high" || level === "restricted";
}

function filterExternalProviders(providers: AiProviderName[]) {
  return providers.filter((provider) => provider === "local_llm" || provider === "mock");
}

export function resolveTaskPolicy(taskType: AiTaskType): AiTaskPolicy {
  const base = DEFAULT_TASK_POLICIES[taskType];
  if (!base) {
    throw createAiError({
      code: "AI_CONFIGURATION_ERROR",
      message: `Unknown task policy: ${taskType}`,
      retriable: false,
    });
  }

  const config = readAiEngineConfig();
  let policy: AiTaskPolicy = { ...base, fallbackChain: [...base.fallbackChain] };

  if (!config.externalProvidersEnabled || config.localOnlyMode) {
    policy = {
      ...policy,
      primaryProvider: policy.primaryProvider === "local_llm" || policy.primaryProvider === "mock" ? policy.primaryProvider : "local_llm",
      fallbackChain: filterExternalProviders(policy.fallbackChain),
      allowExternalProviders: false,
    };
  }

  if (config.failClosedForHighSensitivity && isHighSensitivity(policy.piiSensitivity)) {
    policy = {
      ...policy,
      primaryProvider: "local_llm",
      fallbackChain: filterExternalProviders(policy.fallbackChain),
      allowExternalProviders: false,
      localLlmPreference: "mandatory",
    };
  }

  if (policy.fallbackChain.length === 0) {
    policy.fallbackChain = [policy.primaryProvider];
  }

  return policy;
}