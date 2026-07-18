import type { AiProviderAdapter, AiProviderAdapterInput, AiProviderAdapterResult, AiProviderKind } from "./types.ts";

function simulateProviderOutput(provider: AiProviderKind, input: AiProviderAdapterInput): AiProviderAdapterResult {
  const text = `[${provider}] simulated response for model ${input.modelCode}`;
  const tokenInput = Math.max(1, Math.ceil((input.systemPrompt.length + input.developerPrompt.length + input.userPrompt.length) / 4));
  const tokenOutput = Math.max(16, Math.ceil(text.length / 3));

  return {
    outputText: text,
    outputEmbedding: [],
    tokenInput,
    tokenOutput,
    estimatedCost: 0,
    latencyMs: 0,
    metadata: {
      simulated: true,
      provider,
    },
  };
}

function createAdapter(provider: AiProviderKind): AiProviderAdapter {
  return {
    provider,
    async run(input: AiProviderAdapterInput) {
      return simulateProviderOutput(provider, input);
    },
  };
}

const adapterRegistry: Record<AiProviderKind, AiProviderAdapter> = {
  openai: createAdapter("openai"),
  anthropic: createAdapter("anthropic"),
  google_gemini: createAdapter("google_gemini"),
  azure_openai: createAdapter("azure_openai"),
  deepseek: createAdapter("deepseek"),
  local_llm: createAdapter("local_llm"),
  future: createAdapter("future"),
};

export function getProviderAdapter(provider: AiProviderKind): AiProviderAdapter {
  return adapterRegistry[provider];
}
