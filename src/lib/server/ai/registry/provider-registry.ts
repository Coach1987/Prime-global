import { createAiError } from "../contracts/errors.ts";
import type { AiProviderAdapter, AiProviderName } from "../contracts/types.ts";

export class AiProviderRegistry {
  private readonly providers = new Map<AiProviderName, AiProviderAdapter>();

  register(adapter: AiProviderAdapter) {
    this.providers.set(adapter.provider, adapter);
  }

  get(provider: AiProviderName): AiProviderAdapter {
    const adapter = this.providers.get(provider);
    if (!adapter) {
      throw createAiError({
        code: "AI_CONFIGURATION_ERROR",
        message: `Provider not registered: ${provider}`,
        provider,
        retriable: false,
      });
    }
    return adapter;
  }

  has(provider: AiProviderName): boolean {
    return this.providers.has(provider);
  }

  list(): AiProviderName[] {
    return Array.from(this.providers.keys());
  }
}