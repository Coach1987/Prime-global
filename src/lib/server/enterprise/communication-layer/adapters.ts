import type { CommunicationProviderAdapter, ProviderCode } from "./types.ts";

function unsupported(providerCode: string): never {
  throw new Error(`communication_provider_${providerCode}_not_configured`);
}

export function createNoopCommunicationProviderAdapter(providerCode: ProviderCode, channelType: CommunicationProviderAdapter["channelType"]): CommunicationProviderAdapter {
  return {
    providerCode,
    channelType,
    async send() {
      unsupported(providerCode);
    },
  };
}

export function createCommunicationProviderRegistry(overrides?: Partial<Record<ProviderCode, CommunicationProviderAdapter>>) {
  const defaults: Record<ProviderCode, CommunicationProviderAdapter> = {
    smtp_generic: createNoopCommunicationProviderAdapter("smtp_generic", "email"),
    microsoft_365: createNoopCommunicationProviderAdapter("microsoft_365", "email"),
    google_workspace: createNoopCommunicationProviderAdapter("google_workspace", "email"),
    twilio_sms: createNoopCommunicationProviderAdapter("twilio_sms", "sms"),
    whatsapp_business: createNoopCommunicationProviderAdapter("whatsapp_business", "whatsapp"),
    firebase_push: createNoopCommunicationProviderAdapter("firebase_push", "push"),
  };

  return {
    resolve(providerCode: ProviderCode) {
      return overrides?.[providerCode] ?? defaults[providerCode];
    },
  };
}
