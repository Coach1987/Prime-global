import { NextResponse } from "next/server";
import {
  createAuthorizationPolicySchema,
  createDelegatedPermissionSchema,
  createEnterpriseIdentitySchema,
  createIdentityAuthMethodSchema,
  createIdentitySecurityEventSchema,
  createIdentitySessionSchema,
  createMfaFactorSchema,
  createPasskeyCredentialSchema,
  createSecretRecordSchema,
  createSecurityMonitoringSignalSchema,
  createSecurityPolicyRuleSchema,
  createTrustedDeviceSchema,
  listByOrganizationIdentitySecurityQuerySchema,
  revokeIdentitySessionSchema,
  rotateSecretSchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  createAuthorizationPolicy,
  createDelegatedPermission,
  createEnterpriseIdentity,
  createIdentityAuthMethod,
  createIdentitySession,
  createMfaFactor,
  createPasskeyCredential,
  createSecretRecord,
  createSecurityMonitoringSignal,
  createSecurityPolicyRule,
  createTrustedDevice,
  listAuthorizationPolicies,
  listEnterpriseIdentities,
  listIdentityAuthMethods,
  listIdentitySessions,
  listMfaFactors,
  listPasskeys,
  listSecrets,
  listSecurityEvents,
  listSecurityMonitoringSignals,
  listSecurityPolicyRules,
  listTrustedDevices,
  recordIdentitySecurityEvent,
  revokeIdentitySession,
  rotateSecret,
} from "../../../../../lib/server/enterprise/identity-security-layer";
import { requireIdentitySecurityLayerAccess } from "../_shared";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function parseOrganizationId(request: Request) {
  const url = new URL(request.url);
  const parsed = listByOrganizationIdentitySecurityQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsed.success) {
    return { error: jsonError("INVALID_QUERY", "organizationId is required", 400) };
  }

  return { organizationId: parsed.data.organizationId };
}

async function ensureAccess(request: Request) {
  const auth = await requireIdentitySecurityLayerAccess(request);
  if (auth instanceof NextResponse) return auth;
  return auth;
}

async function handleIdentities(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listEnterpriseIdentities(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createEnterpriseIdentitySchema);
    if (parsed.error) return parsed.error;
    const data = await createEnterpriseIdentity({
      organizationId: parsed.data.organizationId,
      identityType: parsed.data.identityType,
      subjectReference: parsed.data.subjectReference,
      authUserId: parsed.data.authUserId,
      email: parsed.data.email,
      phoneE164: parsed.data.phoneE164,
      displayName: parsed.data.displayName,
      status: parsed.data.status ?? "active",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleAuthMethods(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listIdentityAuthMethods(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createIdentityAuthMethodSchema);
    if (parsed.error) return parsed.error;
    const data = await createIdentityAuthMethod({
      organizationId: parsed.data.organizationId,
      identityId: parsed.data.identityId,
      authMethod: parsed.data.authMethod,
      providerCode: parsed.data.providerCode,
      subject: parsed.data.subject,
      status: parsed.data.status ?? "active",
      passwordlessReady: parsed.data.passwordlessReady ?? false,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleMfa(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listMfaFactors(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createMfaFactorSchema);
    if (parsed.error) return parsed.error;
    const data = await createMfaFactor({
      organizationId: parsed.data.organizationId,
      identityId: parsed.data.identityId,
      factorType: parsed.data.factorType,
      label: parsed.data.label,
      phoneE164: parsed.data.phoneE164,
      email: parsed.data.email,
      secretRef: parsed.data.secretRef,
      status: parsed.data.status ?? "pending",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePasskeys(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listPasskeys(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createPasskeyCredentialSchema);
    if (parsed.error) return parsed.error;
    const data = await createPasskeyCredential({
      organizationId: parsed.data.organizationId,
      identityId: parsed.data.identityId,
      credentialId: parsed.data.credentialId,
      publicKey: parsed.data.publicKey,
      aaguid: parsed.data.aaguid,
      attestationFormat: parsed.data.attestationFormat,
      transports: parsed.data.transports ?? [],
      signCount: parsed.data.signCount ?? 0,
      deviceBound: parsed.data.deviceBound ?? true,
      status: parsed.data.status ?? "active",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSessions(request: Request, segments: string[]) {
  if (segments[1] === "revoke") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, revokeIdentitySessionSchema);
    if (parsed.error) return parsed.error;
    const data = await revokeIdentitySession(parsed.data);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listIdentitySessions(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createIdentitySessionSchema);
    if (parsed.error) return parsed.error;
    const data = await createIdentitySession({
      organizationId: parsed.data.organizationId,
      identityId: parsed.data.identityId,
      authMethod: parsed.data.authMethod,
      sessionTokenHash: parsed.data.sessionTokenHash,
      refreshTokenHash: parsed.data.refreshTokenHash,
      sessionVersion: parsed.data.sessionVersion ?? 1,
      rotationCounter: parsed.data.rotationCounter ?? 0,
      riskLevel: parsed.data.riskLevel ?? "low",
      riskScore: parsed.data.riskScore ?? 0,
      ipAddress: parsed.data.ipAddress,
      userAgent: parsed.data.userAgent,
      idleTimeoutAt: parsed.data.idleTimeoutAt,
      absoluteTimeoutAt: parsed.data.absoluteTimeoutAt,
      status: parsed.data.status ?? "active",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleDevices(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listTrustedDevices(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createTrustedDeviceSchema);
    if (parsed.error) return parsed.error;
    const data = await createTrustedDevice({
      organizationId: parsed.data.organizationId,
      identityId: parsed.data.identityId,
      deviceFingerprint: parsed.data.deviceFingerprint,
      deviceName: parsed.data.deviceName,
      platform: parsed.data.platform,
      verificationMethod: parsed.data.verificationMethod,
      riskLevel: parsed.data.riskLevel ?? "low",
      trustScore: parsed.data.trustScore ?? 50,
      firstSeenAt: parsed.data.firstSeenAt,
      lastSeenAt: parsed.data.lastSeenAt,
      status: parsed.data.status ?? "pending",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleAuthorization(request: Request, segments: string[]) {
  if (segments[1] === "delegations") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, createDelegatedPermissionSchema);
    if (parsed.error) return parsed.error;
    const data = await createDelegatedPermission({
      organizationId: parsed.data.organizationId,
      granterIdentityId: parsed.data.granterIdentityId,
      granteeIdentityId: parsed.data.granteeIdentityId,
      permissionCode: parsed.data.permissionCode,
      scope: parsed.data.scope ?? {},
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      reason: parsed.data.reason,
      status: parsed.data.status ?? "active",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listAuthorizationPolicies(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createAuthorizationPolicySchema);
    if (parsed.error) return parsed.error;
    const data = await createAuthorizationPolicy({
      organizationId: parsed.data.organizationId,
      code: parsed.data.code,
      name: parsed.data.name,
      policyType: parsed.data.policyType,
      effect: parsed.data.effect,
      priority: parsed.data.priority ?? 100,
      conditions: parsed.data.conditions ?? {},
      resourceScope: parsed.data.resourceScope ?? {},
      metadata: parsed.data.metadata ?? {},
      status: parsed.data.status ?? "draft",
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSecrets(request: Request, segments: string[]) {
  if (segments[1] === "rotate") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, rotateSecretSchema);
    if (parsed.error) return parsed.error;
    const data = await rotateSecret(parsed.data);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listSecrets(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createSecretRecordSchema);
    if (parsed.error) return parsed.error;
    const data = await createSecretRecord({
      organizationId: parsed.data.organizationId,
      secretCode: parsed.data.secretCode,
      secretKind: parsed.data.secretKind,
      algorithm: parsed.data.algorithm,
      keyRef: parsed.data.keyRef,
      versionNumber: parsed.data.versionNumber ?? 1,
      rotationPeriodDays: parsed.data.rotationPeriodDays ?? 90,
      status: parsed.data.status ?? "active",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePolicies(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listSecurityPolicyRules(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createSecurityPolicyRuleSchema);
    if (parsed.error) return parsed.error;
    const data = await createSecurityPolicyRule({
      organizationId: parsed.data.organizationId,
      code: parsed.data.code,
      name: parsed.data.name,
      policyDomain: parsed.data.policyDomain,
      ruleExpression: parsed.data.ruleExpression,
      actionOnMatch: parsed.data.actionOnMatch,
      riskWeight: parsed.data.riskWeight ?? 10,
      metadata: parsed.data.metadata ?? {},
      enabled: parsed.data.enabled ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleMonitoring(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listSecurityMonitoringSignals(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createSecurityMonitoringSignalSchema);
    if (parsed.error) return parsed.error;
    const data = await createSecurityMonitoringSignal({
      organizationId: parsed.data.organizationId,
      signalType: parsed.data.signalType,
      severity: parsed.data.severity,
      identityId: parsed.data.identityId,
      sessionId: parsed.data.sessionId,
      sourceIp: parsed.data.sourceIp,
      countryCode: parsed.data.countryCode,
      riskScore: parsed.data.riskScore ?? 0,
      details: parsed.data.details ?? {},
      status: parsed.data.status ?? "open",
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleAuditEvents(request: Request, auth: { userId: string; role: string }) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listSecurityEvents(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createIdentitySecurityEventSchema);
    if (parsed.error) return parsed.error;
    const data = await recordIdentitySecurityEvent({
      organizationId: parsed.data.organizationId,
      eventType: parsed.data.eventType,
      aggregateType: parsed.data.aggregateType,
      aggregateId: parsed.data.aggregateId,
      sourceDomain: parsed.data.sourceDomain,
      sourceReference: parsed.data.sourceReference,
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      severity: parsed.data.severity ?? "info",
      riskScore: parsed.data.riskScore,
      idempotencyKey: parsed.data.idempotencyKey,
      payload: parsed.data.payload ?? {},
      metadata: parsed.data.metadata ?? {},
      occurredAt: parsed.data.occurredAt,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, context);
}

async function handleRequest(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const method = request.method.toUpperCase();
  const rateLimit = enforceRateLimit(request, `pgems-identity-security-layer-${method.toLowerCase()}`, method === "GET" ? 200 : 120);
  if (rateLimit) return rateLimit;
  if (request.method !== "GET") {
    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;
  }

  const auth = await ensureAccess(request);
  if (auth instanceof NextResponse) return auth;

  const params = await context.params;
  const segments = params.path ?? [];

  const root = segments[0];
  if (!root) {
    return jsonError("INVALID_PATH", "Missing identity security path segment", 404);
  }

  if (root === "identities") return handleIdentities(request);
  if (root === "auth-methods") return handleAuthMethods(request);
  if (root === "mfa") return handleMfa(request);
  if (root === "passkeys") return handlePasskeys(request);
  if (root === "sessions") return handleSessions(request, segments);
  if (root === "devices") return handleDevices(request);
  if (root === "authorization") return handleAuthorization(request, segments);
  if (root === "secrets") return handleSecrets(request, segments);
  if (root === "policies") return handlePolicies(request);
  if (root === "monitoring") return handleMonitoring(request);
  if (root === "audit-events") return handleAuditEvents(request, auth);

  return jsonError("INVALID_PATH", `Unknown identity security path: ${root}`, 404);
}
