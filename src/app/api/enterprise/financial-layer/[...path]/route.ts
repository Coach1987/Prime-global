import { NextResponse } from "next/server";
import {
  createBillingPlanSchema,
  createCommissionPolicySchema,
  createCommissionRecordSchema,
  createDisputeSchema,
  createExchangeRateSnapshotSchema,
  createFinancialAccountSchema,
  createInvoiceSchema,
  createJournalWithEntriesSchema,
  createPaymentIntentSchema,
  createPaymentSchema,
  createReconciliationBatchSchema,
  createSubscriptionSchema,
  createTaxRegimeSchema,
  createTaxRuleSchema,
  listByOrganizationFinancialQuerySchema,
} from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  createBillingPlan,
  createCommissionPolicy,
  createCommissionRecord,
  createDispute,
  createExchangeRateSnapshot,
  createFinancialAccount,
  createInvoice,
  createJournalWithEntries,
  createPayment,
  createPaymentIntent,
  createReconciliationBatch,
  createSubscription,
  createTaxRegime,
  createTaxRule,
  listBillingPlans,
  listCommissionPolicies,
  listCommissionRecords,
  listCurrencies,
  listDisputes,
  listExchangeRates,
  listFinancialAccounts,
  listFinancialEvents,
  listInvoices,
  listPaymentIntents,
  listPaymentProviders,
  listPayments,
  listReconciliationBatches,
  listSubscriptions,
  listTaxRegimes,
  listTaxRules,
} from "../../../../../lib/server/enterprise/financial-layer/index";
import { requireFinancialLayerAccess } from "../_shared";

function jsonError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function ensureAccess(request: Request) {
  const auth = await requireFinancialLayerAccess(request);
  if (auth instanceof NextResponse) return auth;
  return auth;
}

function parseOrganizationId(request: Request) {
  const url = new URL(request.url);
  const parsed = listByOrganizationFinancialQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsed.success) {
    return { error: jsonError("INVALID_QUERY", "organizationId is required", 400) };
  }

  return { organizationId: parsed.data.organizationId };
}

async function handleAccounts(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listFinancialAccounts(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createFinancialAccountSchema);
    if (parsed.error) return parsed.error;
    const data = await createFinancialAccount({
      ...parsed.data,
      naturalBalance: parsed.data.naturalBalance ?? "debit",
      isSystem: parsed.data.isSystem ?? false,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleLedgers(request: Request, auth: { userId: string; role: string }) {
  if (request.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const parsed = await parseJsonBody(request, createJournalWithEntriesSchema);
  if (parsed.error) return parsed.error;

  const data = await createJournalWithEntries({
    ...parsed.data,
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}

async function handleBillingPlans(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listBillingPlans(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createBillingPlanSchema);
    if (parsed.error) return parsed.error;
    const data = await createBillingPlan(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleSubscriptions(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listSubscriptions(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createSubscriptionSchema);
    if (parsed.error) return parsed.error;
    const data = await createSubscription(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleInvoices(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listInvoices(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createInvoiceSchema);
    if (parsed.error) return parsed.error;
    const data = await createInvoice({
      ...parsed.data,
      taxAmount: parsed.data.taxAmount ?? 0,
      discountAmount: parsed.data.discountAmount ?? 0,
      metadata: parsed.data.metadata ?? {},
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handlePayments(request: Request, segments: string[]) {
  if (segments[1] === "providers") {
    if (request.method !== "GET") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
    const data = await listPaymentProviders();
    return NextResponse.json({ success: true, data });
  }

  if (segments[1] === "intents") {
    if (request.method === "GET") {
      const parsed = parseOrganizationId(request);
      if (parsed.error) return parsed.error;
      const data = await listPaymentIntents(parsed.organizationId);
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createPaymentIntentSchema);
      if (parsed.error) return parsed.error;
      const data = await createPaymentIntent(parsed.data);
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listPayments(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createPaymentSchema);
    if (parsed.error) return parsed.error;
    const data = await createPayment(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleCommissions(request: Request, segments: string[]) {
  if (segments[1] === "policies") {
    if (request.method === "GET") {
      const parsed = parseOrganizationId(request);
      if (parsed.error) return parsed.error;
      const data = await listCommissionPolicies(parsed.organizationId);
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createCommissionPolicySchema);
      if (parsed.error) return parsed.error;
      const data = await createCommissionPolicy(parsed.data);
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listCommissionRecords(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createCommissionRecordSchema);
    if (parsed.error) return parsed.error;
    const data = await createCommissionRecord(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleTaxes(request: Request, segments: string[]) {
  if (segments[1] === "regimes") {
    if (request.method === "GET") {
      const parsed = parseOrganizationId(request);
      if (parsed.error) return parsed.error;
      const data = await listTaxRegimes(parsed.organizationId);
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createTaxRegimeSchema);
      if (parsed.error) return parsed.error;
      const data = await createTaxRegime(parsed.data);
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  if (segments[1] === "rules") {
    if (request.method === "GET") {
      const parsed = parseOrganizationId(request);
      if (parsed.error) return parsed.error;
      const data = await listTaxRules(parsed.organizationId);
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createTaxRuleSchema);
      if (parsed.error) return parsed.error;
      const data = await createTaxRule(parsed.data);
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  return jsonError("FINANCIAL_LAYER_NOT_FOUND", "Tax endpoint not found", 404);
}

async function handleCurrencies(request: Request, segments: string[]) {
  if (segments[1] === "exchange-rates") {
    if (request.method === "GET") {
      const data = await listExchangeRates();
      return NextResponse.json({ success: true, data });
    }

    if (request.method === "POST") {
      const parsed = await parseJsonBody(request, createExchangeRateSnapshotSchema);
      if (parsed.error) return parsed.error;
      const data = await createExchangeRateSnapshot(parsed.data);
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  if (request.method !== "GET") return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
  const data = await listCurrencies();
  return NextResponse.json({ success: true, data });
}

async function handleReconciliation(request: Request, segments: string[]) {
  if (segments[1] !== "batches") {
    return jsonError("FINANCIAL_LAYER_NOT_FOUND", "Reconciliation endpoint not found", 404);
  }

  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listReconciliationBatches(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createReconciliationBatchSchema);
    if (parsed.error) return parsed.error;
    const data = await createReconciliationBatch(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleDisputes(request: Request) {
  if (request.method === "GET") {
    const parsed = parseOrganizationId(request);
    if (parsed.error) return parsed.error;
    const data = await listDisputes(parsed.organizationId);
    return NextResponse.json({ success: true, data });
  }

  if (request.method === "POST") {
    const parsed = await parseJsonBody(request, createDisputeSchema);
    if (parsed.error) return parsed.error;
    const data = await createDispute(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  }

  return jsonError("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

async function handleAudit(request: Request, segments: string[]) {
  if (segments[1] !== "events" || request.method !== "GET") {
    return jsonError("FINANCIAL_LAYER_NOT_FOUND", "Audit endpoint not found", 404);
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId") ?? undefined;
  const data = await listFinancialEvents(organizationId);
  return NextResponse.json({ success: true, data });
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimit = enforceRateLimit(request, "pgems-financial-layer-get", 200);
  if (rateLimit) return rateLimit;

  const auth = await ensureAccess(request);
  if (auth instanceof NextResponse) return auth;

  const segments = (await params).path ?? [];

  try {
    if (segments[0] === "accounts") return handleAccounts(request);
    if (segments[0] === "invoices") return handleInvoices(request);
    if (segments[0] === "billing" && segments[1] === "plans") return handleBillingPlans(request);
    if (segments[0] === "subscriptions") return handleSubscriptions(request);
    if (segments[0] === "payments") return handlePayments(request, segments);
    if (segments[0] === "commissions") return handleCommissions(request, segments);
    if (segments[0] === "taxes") return handleTaxes(request, segments);
    if (segments[0] === "currencies") return handleCurrencies(request, segments);
    if (segments[0] === "reconciliation") return handleReconciliation(request, segments);
    if (segments[0] === "disputes") return handleDisputes(request);
    if (segments[0] === "audit") return handleAudit(request, segments);
    return jsonError("FINANCIAL_LAYER_NOT_FOUND", "Financial endpoint not found", 404);
  } catch (error) {
    return jsonError("FINANCIAL_LAYER_GET_FAILED", error instanceof Error ? error.message : "Unable to process request", 500);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rateLimit = enforceRateLimit(request, "pgems-financial-layer-post", 120);
  if (rateLimit) return rateLimit;

  const csrf = enforceCsrf(request);
  if (csrf) return csrf;

  const auth = await ensureAccess(request);
  if (auth instanceof NextResponse) return auth;

  const segments = (await params).path ?? [];

  try {
    if (segments[0] === "accounts") return handleAccounts(request);
    if (segments[0] === "ledger" && segments[1] === "journals") return handleLedgers(request, auth);
    if (segments[0] === "invoices") return handleInvoices(request);
    if (segments[0] === "billing" && segments[1] === "plans") return handleBillingPlans(request);
    if (segments[0] === "subscriptions") return handleSubscriptions(request);
    if (segments[0] === "payments") return handlePayments(request, segments);
    if (segments[0] === "commissions") return handleCommissions(request, segments);
    if (segments[0] === "taxes") return handleTaxes(request, segments);
    if (segments[0] === "currencies") return handleCurrencies(request, segments);
    if (segments[0] === "reconciliation") return handleReconciliation(request, segments);
    if (segments[0] === "disputes") return handleDisputes(request);
    return jsonError("FINANCIAL_LAYER_NOT_FOUND", "Financial endpoint not found", 404);
  } catch (error) {
    return jsonError("FINANCIAL_LAYER_POST_FAILED", error instanceof Error ? error.message : "Unable to process request", 500);
  }
}
