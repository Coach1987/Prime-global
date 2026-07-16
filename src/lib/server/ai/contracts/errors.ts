import type { AiError, AiProviderName } from "./types.ts";

export function createAiError(input: {
  code: AiError["code"];
  message: string;
  provider?: AiProviderName;
  retriable?: boolean;
  statusCode?: number;
  safeDetails?: Record<string, string | number | boolean | null>;
}): AiError {
  return {
    code: input.code,
    message: input.message,
    provider: input.provider,
    retriable: input.retriable ?? false,
    statusCode: input.statusCode,
    safeDetails: input.safeDetails,
  };
}

export function unsupportedCapabilityError(provider: AiProviderName, capability: string): AiError {
  return createAiError({
    code: "AI_UNSUPPORTED_CAPABILITY",
    message: `Provider ${provider} does not support ${capability}`,
    provider,
    retriable: false,
  });
}