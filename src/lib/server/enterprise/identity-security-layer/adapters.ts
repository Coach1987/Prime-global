import type { EmailOtpProviderAdapter, SecretManagerAdapter, SmsProviderAdapter } from "./types.ts";

function unsupported(providerCode: string): never {
  throw new Error(`identity_security_provider_${providerCode}_not_configured`);
}

export function createNoopSmsProviderAdapter(providerCode: string): SmsProviderAdapter {
  return {
    providerCode,
    async sendOtp() {
      unsupported(providerCode);
    },
  };
}

export function createNoopEmailOtpProviderAdapter(providerCode: string): EmailOtpProviderAdapter {
  return {
    providerCode,
    async sendOtp() {
      unsupported(providerCode);
    },
  };
}

export function createNoopSecretManagerAdapter(providerCode: string): SecretManagerAdapter {
  return {
    providerCode,
    async putSecret() {
      unsupported(providerCode);
    },
  };
}

export function createIdentitySecurityAdapterRegistry(overrides?: {
  sms?: Record<string, SmsProviderAdapter>;
  emailOtp?: Record<string, EmailOtpProviderAdapter>;
  secretManager?: Record<string, SecretManagerAdapter>;
}) {
  const smsDefaults: Record<string, SmsProviderAdapter> = {
    twilio: createNoopSmsProviderAdapter("twilio"),
    messagebird: createNoopSmsProviderAdapter("messagebird"),
  };

  const emailDefaults: Record<string, EmailOtpProviderAdapter> = {
    resend: createNoopEmailOtpProviderAdapter("resend"),
    ses: createNoopEmailOtpProviderAdapter("ses"),
  };

  const secretDefaults: Record<string, SecretManagerAdapter> = {
    vault: createNoopSecretManagerAdapter("vault"),
    aws_kms: createNoopSecretManagerAdapter("aws_kms"),
  };

  return {
    resolveSms(providerCode: string) {
      return overrides?.sms?.[providerCode] ?? smsDefaults[providerCode] ?? createNoopSmsProviderAdapter(providerCode);
    },
    resolveEmailOtp(providerCode: string) {
      return overrides?.emailOtp?.[providerCode] ?? emailDefaults[providerCode] ?? createNoopEmailOtpProviderAdapter(providerCode);
    },
    resolveSecretManager(providerCode: string) {
      return overrides?.secretManager?.[providerCode] ?? secretDefaults[providerCode] ?? createNoopSecretManagerAdapter(providerCode);
    },
  };
}
