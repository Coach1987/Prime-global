export type IdentityEntityType = "employee" | "employer" | "candidate" | "partner" | "service_account" | "machine_identity";

export type AuthMethod = "password" | "oauth" | "oidc" | "magic_link" | "passkey" | "api_key";

export type MfaMethod = "totp" | "sms" | "email_otp" | "backup_code";

export type SessionRiskLevel = "low" | "medium" | "high" | "critical";

export type SecurityEventSeverity = "info" | "low" | "medium" | "high" | "critical";

export type SecretKind = "api_key" | "internal_token" | "encryption_key" | "signing_key";

export interface SmsProviderAdapter {
  providerCode: string;
  sendOtp(input: { destination: string; otpCode: string; ttlSeconds: number }): Promise<{ status: string; providerReference?: string }>;
}

export interface EmailOtpProviderAdapter {
  providerCode: string;
  sendOtp(input: { destination: string; otpCode: string; ttlSeconds: number }): Promise<{ status: string; providerReference?: string }>;
}

export interface SecretManagerAdapter {
  providerCode: string;
  putSecret(input: { keyRef: string; value: string; metadata?: Record<string, unknown> }): Promise<{ versionRef: string; createdAt: string }>;
}

export interface SecurityEventInput {
  organizationId?: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  sourceDomain: "identity" | "authentication" | "authorization" | "session" | "device" | "secret" | "policy" | "system";
  sourceReference?: string;
  actorAuthUserId?: string;
  actorRole?: string;
  severity: SecurityEventSeverity;
  riskScore?: number;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export type IdentitySecurityPermissionCode =
  | "identity.identities.manage"
  | "identity.auth.manage"
  | "identity.mfa.manage"
  | "identity.passkeys.manage"
  | "identity.sessions.manage"
  | "identity.devices.manage"
  | "identity.authorization.manage"
  | "identity.permissions.delegate"
  | "identity.secrets.manage"
  | "identity.policies.manage"
  | "identity.monitoring.read"
  | "identity.audit.read";
