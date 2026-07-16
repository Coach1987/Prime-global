import { createAiError } from "../contracts/errors.ts";
import type { AiError, AiProviderName, AiRequest } from "../contracts/types.ts";
import { resolveTaskPolicy } from "../routing/task-router.ts";
import { redactSensitiveText } from "./pii-redaction.ts";

interface SafeProviderPayload {
  provider: AiProviderName;
  request: AiRequest;
  redaction: {
    applied: boolean;
    categories: string[];
  };
}

interface SafetyPipelineResult {
  ok: boolean;
  payload?: SafeProviderPayload;
  error?: AiError;
}

function isExternalProvider(provider: AiProviderName) {
  return provider !== "local_llm" && provider !== "mock";
}

function validateRequest(request: AiRequest): AiError | null {
  if (!request.context?.requestId?.trim()) {
    return createAiError({
      code: "AI_POLICY_BLOCKED",
      message: "requestId is required",
      retriable: false,
    });
  }

  if (!request.promptRef?.id?.trim() || !request.promptRef?.version?.trim()) {
    return createAiError({
      code: "AI_POLICY_BLOCKED",
      message: "prompt reference is required",
      retriable: false,
    });
  }

  return null;
}

export function buildSafeProviderPayload(request: AiRequest): SafetyPipelineResult {
  const validationError = validateRequest(request);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const policy = resolveTaskPolicy(request.taskType);
  if (!policy.enabled) {
    return {
      ok: false,
      error: createAiError({
        code: "AI_POLICY_BLOCKED",
        message: `Task ${request.taskType} is disabled by policy`,
        retriable: false,
      }),
    };
  }

  if (policy.requiredCapability !== request.capability) {
    return {
      ok: false,
      error: createAiError({
        code: "AI_POLICY_BLOCKED",
        message: `Task ${request.taskType} requires ${policy.requiredCapability}`,
        retriable: false,
      }),
    };
  }

  const provider = policy.primaryProvider;

  if (!policy.allowExternalProviders && isExternalProvider(provider)) {
    return {
      ok: false,
      error: createAiError({
        code: "AI_POLICY_BLOCKED",
        message: "External provider blocked by policy",
        provider,
        retriable: false,
      }),
    };
  }

  if (!request.allowExternalProviders && isExternalProvider(provider)) {
    return {
      ok: false,
      error: createAiError({
        code: "AI_POLICY_BLOCKED",
        message: "Request disallows external providers",
        provider,
        retriable: false,
      }),
    };
  }

  if (policy.piiSensitivity === "restricted" && isExternalProvider(provider)) {
    return {
      ok: false,
      error: createAiError({
        code: "AI_POLICY_BLOCKED",
        message: "Restricted sensitivity must fail closed for external providers",
        provider,
        retriable: false,
      }),
    };
  }

  const promptRedaction = redactSensitiveText(request.prompt ?? "", policy.piiSensitivity);
  const inputTextRedaction = redactSensitiveText(request.inputText ?? "", policy.piiSensitivity);
  const redactedInputTexts = (request.inputTexts ?? []).map((entry) => redactSensitiveText(entry, policy.piiSensitivity));

  const categories = new Set<string>([
    ...promptRedaction.categories,
    ...inputTextRedaction.categories,
    ...redactedInputTexts.flatMap((entry) => entry.categories),
  ]);

  return {
    ok: true,
    payload: {
      provider,
      request: {
        ...request,
        piiSensitivity: policy.piiSensitivity,
        allowExternalProviders: policy.allowExternalProviders,
        prompt: promptRedaction.redactedText,
        inputText: inputTextRedaction.redactedText,
        inputTexts: redactedInputTexts.map((entry) => entry.redactedText),
        context: {
          ...request.context,
          policyVersion: policy.policyVersion,
        },
      },
      redaction: {
        applied:
          promptRedaction.redactionApplied ||
          inputTextRedaction.redactionApplied ||
          redactedInputTexts.some((entry) => entry.redactionApplied),
        categories: Array.from(categories),
      },
    },
  };
}

export type { SafeProviderPayload, SafetyPipelineResult };