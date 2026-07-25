import { NextResponse } from "next/server";
import {
  acknowledgeInternalMessageSchema,
  addMailboxMemberSchema,
  createCommunicationComplianceLogSchema,
  createCommunicationDeliverySchema,
  createCommunicationEventSchema,
  createCommunicationEventSubscriptionSchema,
  createCommunicationProviderConfigSchema,
  createCommunicationTemplateSchema,
  createCorporateMailIdentitySchema,
  createInternalMessageSchema,
  createMailboxSchema,
  createRetentionPolicySchema,
  createTemplateApprovalRequestSchema,
  createTemplateLocalizationSchema,
  createTemplateVersionSchema,
  listByOrganizationCommunicationQuerySchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  acknowledgeInternalMessage,
  addMailboxMember,
  appendCommunicationComplianceLog,
  createCommunicationDelivery,
  createCommunicationEventSubscription,
  createCommunicationProviderConfig,
  createCommunicationTemplate,
  createCorporateMailIdentity,
  createInternalMessage,
  createMailbox,
  createRetentionPolicy,
  createTemplateApprovalRequest,
  createTemplateLocalization,
  createTemplateVersion,
  listCommunicationDeliveries,
  listCommunicationEvents,
  listCommunicationProviderConfigs,
  listCommunicationTemplates,
  listCorporateMailIdentities,
  listInternalMessages,
  listMailboxes,
  listRetentionPolicies,
  recordCommunicationEvent,
} from "../../../../../lib/server/enterprise/communication-layer";
import { requireCommunicationLayerAccess } from "../_shared";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function parseOrganizationId(request: Request) {
  const url = new URL(request.url);
  const parsed = listByOrganizationCommunicationQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsed.success) {
    return { error: jsonError("INVALID_QUERY", "organizationId is required", 400) };
  }

  return { organizationId: parsed.data.organizationId };
}

async function ensureAccess(request: Request) {
  const auth = await requireCommunicationLayerAccess(request);
  if (auth instanceof NextResponse) return auth;
  return auth;
}

async function handleMailIdentities(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listCorporateMailIdentities(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCorporateMailIdentitySchema);
    if (parsed.error) return parsed.error;
    const data = await createCorporateMailIdentity({
      ...parsed.data,
      status: parsed.data.status ?? "active",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleMailboxes(request: Request, segments: string[]) {
  if (segments[1] === "members") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, addMailboxMemberSchema);
    if (parsed.error) return parsed.error;
    const data = await addMailboxMember({
      ...parsed.data,
      canSend: parsed.data.canSend ?? false,
      canManage: parsed.data.canManage ?? false,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listMailboxes(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createMailboxSchema);
    if (parsed.error) return parsed.error;
    const data = await createMailbox({
      ...parsed.data,
      isActive: parsed.data.isActive ?? true,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleRetentionPolicies(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listRetentionPolicies(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createRetentionPolicySchema);
    if (parsed.error) return parsed.error;
    const data = await createRetentionPolicy(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTemplates(request: Request, auth: { userId: string; role: string }, segments: string[]) {
  if (segments[1] === "versions") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, createTemplateVersionSchema);
    if (parsed.error) return parsed.error;
    const data = await createTemplateVersion({
      templateId: parsed.data.templateId,
      versionNumber: parsed.data.versionNumber,
      changeSummary: parsed.data.changeSummary,
      content: parsed.data.content ?? {},
      createdByAuthUserId: auth.userId,
      approvalStatus: parsed.data.approvalStatus ?? "draft",
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (segments[1] === "localizations") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, createTemplateLocalizationSchema);
    if (parsed.error) return parsed.error;
    const data = await createTemplateLocalization(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (segments[1] === "approvals") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, createTemplateApprovalRequestSchema);
    if (parsed.error) return parsed.error;
    const data = await createTemplateApprovalRequest({
      ...parsed.data,
      requestedByAuthUserId: auth.userId,
      status: parsed.data.status ?? "pending",
      decisionByAuthUserId: parsed.data.status === "approved" || parsed.data.status === "rejected" ? auth.userId : undefined,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listCommunicationTemplates(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCommunicationTemplateSchema);
    if (parsed.error) return parsed.error;
    const data = await createCommunicationTemplate({
      organizationId: parsed.data.organizationId,
      code: parsed.data.code,
      name: parsed.data.name,
      templateType: parsed.data.templateType,
      category: parsed.data.category,
      status: parsed.data.status ?? "draft",
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleMessaging(request: Request, segments: string[]) {
  if (segments[1] === "acknowledge") {
    if (request.method !== "POST") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const parsed = await parseJsonBody(request, acknowledgeInternalMessageSchema);
    if (parsed.error) return parsed.error;
    const data = await acknowledgeInternalMessage(parsed.data);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listInternalMessages(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createInternalMessageSchema);
    if (parsed.error) return parsed.error;
    const data = await createInternalMessage({
      organizationId: parsed.data.organizationId,
      messageType: parsed.data.messageType,
      departmentId: parsed.data.departmentId,
      senderEmployeeId: parsed.data.senderEmployeeId,
      senderRoleCode: parsed.data.senderRoleCode,
      title: parsed.data.title,
      body: parsed.data.body,
      sensitivity: parsed.data.sensitivity ?? "normal",
      pinned: parsed.data.pinned ?? false,
      pinnedUntil: parsed.data.pinnedUntil,
      recipientEmployeeIds: parsed.data.recipientEmployeeIds ?? [],
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleProviders(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listCommunicationProviderConfigs(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCommunicationProviderConfigSchema);
    if (parsed.error) return parsed.error;
    const data = await createCommunicationProviderConfig({
      organizationId: parsed.data.organizationId,
      providerId: parsed.data.providerId,
      mode: parsed.data.mode ?? "test",
      config: parsed.data.config ?? {},
      metadata: parsed.data.metadata ?? {},
      priority: parsed.data.priority ?? 100,
      isFallback: parsed.data.isFallback ?? false,
      isActive: parsed.data.isActive ?? true,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleEventSubscriptions(request: Request) {
  if (request.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const parsed = await parseJsonBody(request, createCommunicationEventSubscriptionSchema);
  if (parsed.error) return parsed.error;
  const data = await createCommunicationEventSubscription(parsed.data);
  return NextResponse.json({ success: true, data }, { status: 201 });
}

async function handleDeliveries(request: Request) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") ?? undefined;
    const data = await listCommunicationDeliveries(organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCommunicationDeliverySchema);
    if (parsed.error) return parsed.error;
    const data = await createCommunicationDelivery({
      organizationId: parsed.data.organizationId,
      messageRef: parsed.data.messageRef,
      channelType: parsed.data.channelType,
      providerConfigId: parsed.data.providerConfigId,
      recipientRef: parsed.data.recipientRef,
      status: parsed.data.status,
      priority: parsed.data.priority ?? "normal",
      maxAttempts: parsed.data.maxAttempts ?? 5,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleCompliance(request: Request, auth: { userId: string; role: string }) {
  if (request.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const parsed = await parseJsonBody(request, createCommunicationComplianceLogSchema);
  if (parsed.error) return parsed.error;

  const data = await appendCommunicationComplianceLog({
    ...parsed.data,
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}

async function handleAuditEvents(request: Request, auth: { userId: string; role: string }) {
  if (request.method === "GET") {
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId") ?? undefined;
    const data = await listCommunicationEvents(organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCommunicationEventSchema);
    if (parsed.error) return parsed.error;
    const data = await recordCommunicationEvent({
      ...parsed.data,
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

function dispatch(request: Request, auth: { userId: string; role: string }, segments: string[]) {
  const root = segments[0];
  if (root === "mail-identities") return handleMailIdentities(request);
  if (root === "mailboxes") return handleMailboxes(request, segments);
  if (root === "retention-policies") return handleRetentionPolicies(request);
  if (root === "templates") return handleTemplates(request, auth, segments);
  if (root === "messaging") return handleMessaging(request, segments);
  if (root === "providers") return handleProviders(request);
  if (root === "event-subscriptions") return handleEventSubscriptions(request);
  if (root === "deliveries") return handleDeliveries(request);
  if (root === "compliance") return handleCompliance(request, auth);
  if (root === "audit-events") return handleAuditEvents(request, auth);
  return jsonError("COMMUNICATION_LAYER_NOT_FOUND", "Communication endpoint not found", 404);
}

async function handle(request: Request, params: Promise<{ path: string[] }>, method: "GET" | "POST") {
  const rateLimit = enforceRateLimit(request, `pgems-communication-layer-${method.toLowerCase()}`, method === "GET" ? 200 : 120);
  if (rateLimit) return rateLimit;

  if (method === "POST") {
    const csrf = enforceCsrf(request);
    if (csrf) return csrf;
  }

  const auth = await ensureAccess(request);
  if (auth instanceof NextResponse) return auth;

  const segments = (await params).path ?? [];

  try {
    return await dispatch(request, auth, segments);
  } catch (error) {
    return jsonError(
      `COMMUNICATION_LAYER_${method}_FAILED`,
      error instanceof Error ? error.message : "Unable to process communication request",
      500
    );
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, params, "GET");
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return handle(request, params, "POST");
}
