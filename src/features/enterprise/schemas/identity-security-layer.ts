import { z } from "zod";

const codeSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9_.:-]+$/i);
const nameSchema = z.string().trim().min(2).max(180);
const metadataSchema = z.record(z.unknown()).default({});

export const listByOrganizationIdentitySecurityQuerySchema = z.object({
  organizationId: z.string().uuid(),
});

export const createEnterpriseIdentitySchema = z.object({
  organizationId: z.string().uuid(),
  identityType: z.enum(["employee", "employer", "candidate", "partner", "service_account", "machine_identity"]),
  subjectReference: z.string().trim().min(2).max(200),
  authUserId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phoneE164: z.string().trim().max(32).optional(),
  displayName: z.string().trim().max(180).optional(),
  status: z.enum(["active", "suspended", "locked", "archived"]).default("active"),
  metadata: metadataSchema,
});

export const createIdentityAuthMethodSchema = z.object({
  organizationId: z.string().uuid(),
  identityId: z.string().uuid(),
  authMethod: z.enum(["password", "oauth", "oidc", "magic_link", "passkey", "api_key"]),
  providerCode: codeSchema.optional(),
  subject: z.string().trim().max(200).optional(),
  status: z.enum(["active", "disabled", "compromised"]).default("active"),
  passwordlessReady: z.boolean().default(false),
  metadata: metadataSchema,
});

export const createMfaFactorSchema = z.object({
  organizationId: z.string().uuid(),
  identityId: z.string().uuid(),
  factorType: z.enum(["totp", "sms", "email_otp", "backup_code"]),
  label: z.string().trim().max(160).optional(),
  phoneE164: z.string().trim().max(32).optional(),
  email: z.string().email().optional(),
  secretRef: z.string().trim().max(220).optional(),
  status: z.enum(["active", "pending", "disabled", "revoked"]).default("pending"),
  metadata: metadataSchema,
});

export const createPasskeyCredentialSchema = z.object({
  organizationId: z.string().uuid(),
  identityId: z.string().uuid(),
  credentialId: z.string().trim().min(10).max(400),
  publicKey: z.string().trim().min(10).max(4000),
  aaguid: z.string().trim().max(120).optional(),
  attestationFormat: z.string().trim().max(120).optional(),
  transports: z.array(z.string().trim().max(40)).default([]),
  signCount: z.number().int().min(0).default(0),
  deviceBound: z.boolean().default(true),
  status: z.enum(["active", "revoked", "compromised"]).default("active"),
  metadata: metadataSchema,
});

export const createIdentitySessionSchema = z.object({
  organizationId: z.string().uuid(),
  identityId: z.string().uuid(),
  authMethod: z.enum(["password", "oauth", "oidc", "magic_link", "passkey", "api_key"]),
  sessionTokenHash: z.string().trim().min(20).max(512),
  refreshTokenHash: z.string().trim().max(512).optional(),
  sessionVersion: z.number().int().min(1).default(1),
  rotationCounter: z.number().int().min(0).default(0),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("low"),
  riskScore: z.number().int().min(0).max(100).default(0),
  ipAddress: z.string().trim().max(128).optional(),
  userAgent: z.string().trim().max(2000).optional(),
  idleTimeoutAt: z.string().datetime().optional(),
  absoluteTimeoutAt: z.string().datetime().optional(),
  status: z.enum(["active", "revoked", "expired", "rotated"]).default("active"),
  metadata: metadataSchema,
});

export const revokeIdentitySessionSchema = z.object({
  sessionId: z.string().uuid(),
  revokedReason: z.string().trim().max(500).optional(),
});

export const createTrustedDeviceSchema = z.object({
  organizationId: z.string().uuid(),
  identityId: z.string().uuid(),
  deviceFingerprint: z.string().trim().min(10).max(500),
  deviceName: z.string().trim().max(180).optional(),
  platform: z.string().trim().max(80).optional(),
  verificationMethod: z.enum(["email_otp", "sms_otp", "passkey", "admin_override"]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).default("low"),
  trustScore: z.number().int().min(0).max(100).default(50),
  firstSeenAt: z.string().datetime().optional(),
  lastSeenAt: z.string().datetime().optional(),
  status: z.enum(["trusted", "pending", "blocked", "revoked"]).default("pending"),
  metadata: metadataSchema,
});

export const createAuthorizationPolicySchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  policyType: z.enum(["rbac", "abac", "policy_based", "zero_trust"]),
  effect: z.enum(["allow", "deny"]),
  priority: z.number().int().min(1).max(10000).default(100),
  conditions: metadataSchema,
  resourceScope: metadataSchema,
  metadata: metadataSchema,
  status: z.enum(["draft", "active", "disabled", "archived"]).default("draft"),
});

export const createDelegatedPermissionSchema = z.object({
  organizationId: z.string().uuid(),
  granterIdentityId: z.string().uuid(),
  granteeIdentityId: z.string().uuid(),
  permissionCode: codeSchema,
  scope: metadataSchema,
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  reason: z.string().trim().max(500).optional(),
  status: z.enum(["active", "revoked", "expired"]).default("active"),
  metadata: metadataSchema,
});

export const createSecretRecordSchema = z.object({
  organizationId: z.string().uuid(),
  secretCode: codeSchema,
  secretKind: z.enum(["api_key", "internal_token", "encryption_key", "signing_key"]),
  algorithm: z.string().trim().max(120).optional(),
  keyRef: z.string().trim().min(4).max(400),
  versionNumber: z.number().int().min(1).default(1),
  rotationPeriodDays: z.number().int().min(1).max(3650).default(90),
  status: z.enum(["active", "rotating", "retired", "compromised"]).default("active"),
  metadata: metadataSchema,
});

export const rotateSecretSchema = z.object({
  secretId: z.string().uuid(),
  keyRef: z.string().trim().min(4).max(400),
  rotatedByAuthUserId: z.string().uuid().optional(),
  reason: z.string().trim().max(500).optional(),
  metadata: metadataSchema,
});

export const createSecurityPolicyRuleSchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  policyDomain: z.enum(["authentication", "authorization", "session", "device", "secret", "zero_trust"]),
  ruleExpression: z.string().trim().min(5).max(8000),
  actionOnMatch: z.enum(["allow", "deny", "step_up_auth", "manual_review", "revoke_session"]),
  riskWeight: z.number().int().min(0).max(100).default(10),
  metadata: metadataSchema,
  enabled: z.boolean().default(true),
});

export const createSecurityMonitoringSignalSchema = z.object({
  organizationId: z.string().uuid(),
  signalType: z.enum(["suspicious_login", "impossible_travel", "brute_force", "anomalous_access", "policy_violation"]),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  identityId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  sourceIp: z.string().trim().max(128).optional(),
  countryCode: z.string().trim().min(2).max(10).transform((value) => value.toUpperCase()).optional(),
  riskScore: z.number().int().min(0).max(100).default(0),
  details: metadataSchema,
  status: z.enum(["open", "investigating", "mitigated", "false_positive", "closed"]).default("open"),
});

export const createIdentitySecurityEventSchema = z.object({
  organizationId: z.string().uuid().optional(),
  eventType: codeSchema,
  aggregateType: z.string().trim().min(2).max(120),
  aggregateId: z.string().trim().min(1).max(180),
  sourceDomain: z.enum(["identity", "authentication", "authorization", "session", "device", "secret", "policy", "system"]),
  sourceReference: z.string().trim().max(180).optional(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]).default("info"),
  riskScore: z.number().int().min(0).max(100).optional(),
  idempotencyKey: z.string().trim().max(180).optional(),
  payload: metadataSchema,
  metadata: metadataSchema,
  occurredAt: z.string().datetime().optional(),
});
