import { createSupabaseAdminClient } from "../../supabase.ts";
import type { SecurityEventInput, SessionRiskLevel } from "./types.ts";

async function listRows<T>(table: string, organizationId?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function createRow<T>(table: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data as T;
}

export function evaluateSessionRisk(input: {
  impossibleTravelDetected?: boolean;
  suspiciousDeviceDetected?: boolean;
  bruteForceSignalDetected?: boolean;
  geoVelocityScore?: number;
}): { riskLevel: SessionRiskLevel; riskScore: number } {
  const score =
    (input.impossibleTravelDetected ? 45 : 0) +
    (input.suspiciousDeviceDetected ? 25 : 0) +
    (input.bruteForceSignalDetected ? 20 : 0) +
    Math.max(0, Math.min(10, Math.floor(input.geoVelocityScore ?? 0)));

  if (score >= 75) return { riskLevel: "critical", riskScore: score };
  if (score >= 50) return { riskLevel: "high", riskScore: score };
  if (score >= 25) return { riskLevel: "medium", riskScore: score };
  return { riskLevel: "low", riskScore: score };
}

export async function recordIdentitySecurityEvent(input: SecurityEventInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("pgems_record_identity_security_event", {
    p_organization_id: input.organizationId ?? null,
    p_event_type: input.eventType,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_source_domain: input.sourceDomain,
    p_source_reference: input.sourceReference ?? null,
    p_actor_auth_user_id: input.actorAuthUserId ?? null,
    p_actor_role: input.actorRole ?? null,
    p_severity: input.severity,
    p_risk_score: input.riskScore ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_payload: input.payload ?? {},
    p_metadata: input.metadata ?? {},
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw error;
  return data;
}

export async function listEnterpriseIdentities(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_enterprise_identities", organizationId);
}

export async function createEnterpriseIdentity(payload: {
  organizationId: string;
  identityType: "employee" | "employer" | "candidate" | "partner" | "service_account" | "machine_identity";
  subjectReference: string;
  authUserId?: string;
  email?: string;
  phoneE164?: string;
  displayName?: string;
  status: "active" | "suspended" | "locked" | "archived";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_enterprise_identities", {
    organization_id: payload.organizationId,
    identity_type: payload.identityType,
    subject_reference: payload.subjectReference,
    auth_user_id: payload.authUserId ?? null,
    email: payload.email ?? null,
    phone_e164: payload.phoneE164 ?? null,
    display_name: payload.displayName ?? null,
    status: payload.status,
    metadata: payload.metadata ?? {},
  });
}

export async function listIdentityAuthMethods(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_identity_auth_methods", organizationId);
}

export async function createIdentityAuthMethod(payload: {
  organizationId: string;
  identityId: string;
  authMethod: "password" | "oauth" | "oidc" | "magic_link" | "passkey" | "api_key";
  providerCode?: string;
  subject?: string;
  status?: "active" | "disabled" | "compromised";
  passwordlessReady?: boolean;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_identity_auth_methods", {
    organization_id: payload.organizationId,
    identity_id: payload.identityId,
    auth_method: payload.authMethod,
    provider_code: payload.providerCode ?? null,
    subject: payload.subject ?? null,
    status: payload.status ?? "active",
    passwordless_ready: payload.passwordlessReady ?? false,
    metadata: payload.metadata ?? {},
  });
}

export async function listMfaFactors(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_identity_mfa_factors", organizationId);
}

export async function createMfaFactor(payload: {
  organizationId: string;
  identityId: string;
  factorType: "totp" | "sms" | "email_otp" | "backup_code";
  label?: string;
  phoneE164?: string;
  email?: string;
  secretRef?: string;
  status?: "active" | "pending" | "disabled" | "revoked";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_identity_mfa_factors", {
    organization_id: payload.organizationId,
    identity_id: payload.identityId,
    factor_type: payload.factorType,
    label: payload.label ?? null,
    phone_e164: payload.phoneE164 ?? null,
    email: payload.email ?? null,
    secret_ref: payload.secretRef ?? null,
    status: payload.status ?? "pending",
    metadata: payload.metadata ?? {},
  });
}

export async function listPasskeys(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_identity_passkeys", organizationId);
}

export async function createPasskeyCredential(payload: {
  organizationId: string;
  identityId: string;
  credentialId: string;
  publicKey: string;
  aaguid?: string;
  attestationFormat?: string;
  transports?: unknown[];
  signCount?: number;
  deviceBound?: boolean;
  status?: "active" | "revoked" | "compromised";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_identity_passkeys", {
    organization_id: payload.organizationId,
    identity_id: payload.identityId,
    credential_id: payload.credentialId,
    public_key: payload.publicKey,
    aaguid: payload.aaguid ?? null,
    attestation_format: payload.attestationFormat ?? null,
    transports: payload.transports ?? [],
    sign_count: payload.signCount ?? 0,
    device_bound: payload.deviceBound ?? true,
    status: payload.status ?? "active",
    metadata: payload.metadata ?? {},
  });
}

export async function listIdentitySessions(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_identity_sessions", organizationId);
}

export async function createIdentitySession(payload: {
  organizationId: string;
  identityId: string;
  authMethod: "password" | "oauth" | "oidc" | "magic_link" | "passkey" | "api_key";
  sessionTokenHash: string;
  refreshTokenHash?: string;
  sessionVersion?: number;
  rotationCounter?: number;
  riskLevel?: "low" | "medium" | "high" | "critical";
  riskScore?: number;
  ipAddress?: string;
  userAgent?: string;
  idleTimeoutAt?: string;
  absoluteTimeoutAt?: string;
  status?: "active" | "revoked" | "expired" | "rotated";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_identity_sessions", {
    organization_id: payload.organizationId,
    identity_id: payload.identityId,
    auth_method: payload.authMethod,
    session_token_hash: payload.sessionTokenHash,
    refresh_token_hash: payload.refreshTokenHash ?? null,
    session_version: payload.sessionVersion ?? 1,
    rotation_counter: payload.rotationCounter ?? 0,
    risk_level: payload.riskLevel ?? "low",
    risk_score: payload.riskScore ?? 0,
    ip_address: payload.ipAddress ?? null,
    user_agent: payload.userAgent ?? null,
    idle_timeout_at: payload.idleTimeoutAt ?? null,
    absolute_timeout_at: payload.absoluteTimeoutAt ?? null,
    status: payload.status ?? "active",
    metadata: payload.metadata ?? {},
  });
}

export async function revokeIdentitySession(payload: { sessionId: string; revokedReason?: string }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pgems_identity_sessions")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_reason: payload.revokedReason ?? null, updated_at: new Date().toISOString() })
    .eq("id", payload.sessionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listTrustedDevices(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_identity_trusted_devices", organizationId);
}

export async function createTrustedDevice(payload: {
  organizationId: string;
  identityId: string;
  deviceFingerprint: string;
  deviceName?: string;
  platform?: string;
  verificationMethod: "email_otp" | "sms_otp" | "passkey" | "admin_override";
  riskLevel?: "low" | "medium" | "high" | "critical";
  trustScore?: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  status?: "trusted" | "pending" | "blocked" | "revoked";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_identity_trusted_devices", {
    organization_id: payload.organizationId,
    identity_id: payload.identityId,
    device_fingerprint: payload.deviceFingerprint,
    device_name: payload.deviceName ?? null,
    platform: payload.platform ?? null,
    verification_method: payload.verificationMethod,
    risk_level: payload.riskLevel ?? "low",
    trust_score: payload.trustScore ?? 50,
    first_seen_at: payload.firstSeenAt ?? new Date().toISOString(),
    last_seen_at: payload.lastSeenAt ?? new Date().toISOString(),
    status: payload.status ?? "pending",
    metadata: payload.metadata ?? {},
  });
}

export async function listAuthorizationPolicies(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_enterprise_authorization_policies", organizationId);
}

export async function createAuthorizationPolicy(payload: {
  organizationId: string;
  code: string;
  name: string;
  policyType: "rbac" | "abac" | "policy_based" | "zero_trust";
  effect: "allow" | "deny";
  priority?: number;
  conditions?: Record<string, unknown>;
  resourceScope?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status?: "draft" | "active" | "disabled" | "archived";
}) {
  return createRow<Record<string, unknown>>("pgems_enterprise_authorization_policies", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    policy_type: payload.policyType,
    effect: payload.effect,
    priority: payload.priority ?? 100,
    conditions: payload.conditions ?? {},
    resource_scope: payload.resourceScope ?? {},
    metadata: payload.metadata ?? {},
    status: payload.status ?? "draft",
  });
}

export async function createDelegatedPermission(payload: {
  organizationId: string;
  granterIdentityId: string;
  granteeIdentityId: string;
  permissionCode: string;
  scope: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  reason?: string;
  status?: "active" | "revoked" | "expired";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_identity_delegated_permissions", {
    organization_id: payload.organizationId,
    granter_identity_id: payload.granterIdentityId,
    grantee_identity_id: payload.granteeIdentityId,
    permission_code: payload.permissionCode,
    scope: payload.scope,
    starts_at: payload.startsAt ?? new Date().toISOString(),
    ends_at: payload.endsAt ?? null,
    reason: payload.reason ?? null,
    status: payload.status ?? "active",
    metadata: payload.metadata ?? {},
  });
}

export async function listSecrets(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_security_secrets", organizationId);
}

export async function createSecretRecord(payload: {
  organizationId: string;
  secretCode: string;
  secretKind: "api_key" | "internal_token" | "encryption_key" | "signing_key";
  algorithm?: string;
  keyRef: string;
  versionNumber?: number;
  rotationPeriodDays?: number;
  status?: "active" | "rotating" | "retired" | "compromised";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_security_secrets", {
    organization_id: payload.organizationId,
    secret_code: payload.secretCode,
    secret_kind: payload.secretKind,
    algorithm: payload.algorithm ?? null,
    key_ref: payload.keyRef,
    version_number: payload.versionNumber ?? 1,
    rotation_period_days: payload.rotationPeriodDays ?? 90,
    status: payload.status ?? "active",
    metadata: payload.metadata ?? {},
  });
}

export async function rotateSecret(payload: {
  secretId: string;
  keyRef: string;
  rotatedByAuthUserId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: secret, error: secretError } = await supabase
    .from("pgems_security_secrets")
    .select("id, version_number")
    .eq("id", payload.secretId)
    .single();

  if (secretError) throw secretError;

  const nextVersion = Number(secret.version_number ?? 1) + 1;
  const { data, error } = await supabase
    .from("pgems_security_secret_versions")
    .insert({
      secret_id: payload.secretId,
      version_number: nextVersion,
      key_ref: payload.keyRef,
      rotated_by_auth_user_id: payload.rotatedByAuthUserId ?? null,
      reason: payload.reason ?? null,
      metadata: payload.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: updateError } = await supabase
    .from("pgems_security_secrets")
    .update({ version_number: nextVersion, key_ref: payload.keyRef, status: "rotating", updated_at: new Date().toISOString() })
    .eq("id", payload.secretId);

  if (updateError) throw updateError;
  return data;
}

export async function listSecurityPolicyRules(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_security_policy_rules", organizationId);
}

export async function createSecurityPolicyRule(payload: {
  organizationId: string;
  code: string;
  name: string;
  policyDomain: "authentication" | "authorization" | "session" | "device" | "secret" | "zero_trust";
  ruleExpression: string;
  actionOnMatch: "allow" | "deny" | "step_up_auth" | "manual_review" | "revoke_session";
  riskWeight?: number;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
}) {
  return createRow<Record<string, unknown>>("pgems_security_policy_rules", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    policy_domain: payload.policyDomain,
    rule_expression: payload.ruleExpression,
    action_on_match: payload.actionOnMatch,
    risk_weight: payload.riskWeight ?? 10,
    metadata: payload.metadata ?? {},
    enabled: payload.enabled ?? true,
  });
}

export async function listSecurityEvents(organizationId?: string) {
  return listRows<Record<string, unknown>>("pgems_identity_security_events", organizationId);
}

export async function listSecurityMonitoringSignals(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_security_monitoring_signals", organizationId);
}

export async function createSecurityMonitoringSignal(payload: {
  organizationId: string;
  signalType: "suspicious_login" | "impossible_travel" | "brute_force" | "anomalous_access" | "policy_violation";
  severity: "info" | "low" | "medium" | "high" | "critical";
  identityId?: string;
  sessionId?: string;
  sourceIp?: string;
  countryCode?: string;
  riskScore?: number;
  details?: Record<string, unknown>;
  status?: "open" | "investigating" | "mitigated" | "false_positive" | "closed";
}) {
  return createRow<Record<string, unknown>>("pgems_security_monitoring_signals", {
    organization_id: payload.organizationId,
    signal_type: payload.signalType,
    severity: payload.severity,
    identity_id: payload.identityId ?? null,
    session_id: payload.sessionId ?? null,
    source_ip: payload.sourceIp ?? null,
    country_code: payload.countryCode ?? null,
    risk_score: payload.riskScore ?? 0,
    details: payload.details ?? {},
    status: payload.status ?? "open",
  });
}
