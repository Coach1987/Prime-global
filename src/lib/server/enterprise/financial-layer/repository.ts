import { createSupabaseAdminClient } from "../../supabase.ts";
import type { FinancialEventInput, JournalBalanceResult, JournalLine } from "./types.ts";

async function listRows<T>(table: string, organizationId?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).select("*").order("created_at", { ascending: true });
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

export function evaluateJournalBalance(lines: JournalLine[]): JournalBalanceResult {
  const debitTotal = lines.filter((line) => line.entryType === "debit").reduce((sum, line) => sum + line.amount, 0);
  const creditTotal = lines.filter((line) => line.entryType === "credit").reduce((sum, line) => sum + line.amount, 0);

  return {
    balanced: Math.abs(debitTotal - creditTotal) < 1e-9,
    debitTotal,
    creditTotal,
  };
}

export async function recordFinancialEvent(input: FinancialEventInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc("pgems_record_financial_event", {
    p_organization_id: input.organizationId ?? null,
    p_event_type: input.eventType,
    p_event_version: input.eventVersion ?? 1,
    p_aggregate_type: input.aggregateType,
    p_aggregate_id: input.aggregateId,
    p_source_domain: input.sourceDomain,
    p_source_reference: input.sourceReference ?? null,
    p_actor_auth_user_id: input.actorAuthUserId ?? null,
    p_actor_role: input.actorRole ?? null,
    p_correlation_id: input.correlationId ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_payload: input.payload ?? {},
    p_metadata: input.metadata ?? {},
    p_occurred_at: input.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw error;
  return data;
}

export async function listFinancialAccounts(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_financial_accounts", organizationId);
}

export async function createFinancialAccount(payload: {
  organizationId: string;
  code: string;
  name: string;
  accountType: string;
  naturalBalance: "debit" | "credit";
  currencyCode: string;
  parentAccountId?: string;
  isSystem?: boolean;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_financial_accounts", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    account_type: payload.accountType,
    natural_balance: payload.naturalBalance,
    currency_code: payload.currencyCode,
    parent_account_id: payload.parentAccountId ?? null,
    is_system: payload.isSystem ?? false,
    metadata: payload.metadata ?? {},
  });
}

export async function createJournalWithEntries(payload: {
  organizationId: string;
  journalNumber: string;
  sourceDomain: string;
  sourceReference?: string;
  description?: string;
  journalDate?: string;
  currencyCode: string;
  lines: JournalLine[];
  actorAuthUserId?: string;
  actorRole?: string;
}) {
  const balance = evaluateJournalBalance(payload.lines);
  if (!balance.balanced) {
    throw new Error("journal_not_balanced");
  }

  const supabase = createSupabaseAdminClient();
  const { data: journal, error: journalError } = await supabase
    .from("pgems_financial_journals")
    .insert({
      organization_id: payload.organizationId,
      journal_number: payload.journalNumber,
      source_domain: payload.sourceDomain,
      source_reference: payload.sourceReference ?? null,
      description: payload.description ?? null,
      status: "posted",
      journal_date: payload.journalDate ?? new Date().toISOString().slice(0, 10),
      posted_at: new Date().toISOString(),
      posted_by_auth_user_id: payload.actorAuthUserId ?? null,
      currency_code: payload.currencyCode,
      metadata: { debitTotal: balance.debitTotal, creditTotal: balance.creditTotal },
    })
    .select("*")
    .single();

  if (journalError) throw journalError;

  const { error: linesError } = await supabase.from("pgems_financial_journal_entries").insert(
    payload.lines.map((line) => ({
      organization_id: payload.organizationId,
      journal_id: journal.id,
      account_id: line.accountId,
      entry_type: line.entryType,
      amount: line.amount,
      currency_code: line.currencyCode,
      exchange_rate: line.exchangeRate ?? null,
      base_amount: line.baseAmount ?? null,
      line_description: line.lineDescription ?? null,
      metadata: line.metadata ?? {},
    }))
  );

  if (linesError) throw linesError;

  await recordFinancialEvent({
    organizationId: payload.organizationId,
    eventType: "financial.ledger.journal_posted",
    aggregateType: "journal",
    aggregateId: String(journal.id),
    sourceDomain: payload.sourceDomain,
    sourceReference: payload.sourceReference,
    actorAuthUserId: payload.actorAuthUserId,
    actorRole: payload.actorRole,
    payload: {
      journalNumber: payload.journalNumber,
      debitTotal: balance.debitTotal,
      creditTotal: balance.creditTotal,
      lineCount: payload.lines.length,
    },
  });

  return { journal, balance };
}

export async function listInvoices(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_invoices", organizationId);
}

export async function createInvoice(payload: {
  organizationId: string;
  accountId: string;
  subscriptionId?: string;
  invoiceType: "recurring" | "one_time" | "manual" | "proforma";
  currencyCode: string;
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  issuedAt?: string;
  dueAt?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: generated, error: sequenceError } = await supabase.rpc("pgems_generate_invoice_number", {
    p_organization_id: payload.organizationId,
  });

  if (sequenceError) throw sequenceError;
  const generatedRow = Array.isArray(generated) ? generated[0] : generated;
  const invoiceSequence = Number((generatedRow as { invoice_sequence?: number }).invoice_sequence ?? 0);
  const invoiceNumber = String((generatedRow as { invoice_number?: string }).invoice_number ?? "");

  const totalAmount = payload.subtotalAmount + payload.taxAmount - payload.discountAmount;

  const invoice = await createRow<Record<string, unknown>>("pgems_invoices", {
    organization_id: payload.organizationId,
    account_id: payload.accountId,
    subscription_id: payload.subscriptionId ?? null,
    invoice_type: payload.invoiceType,
    invoice_number: invoiceNumber,
    invoice_sequence: invoiceSequence,
    status: "issued",
    currency_code: payload.currencyCode,
    subtotal_amount: payload.subtotalAmount,
    tax_amount: payload.taxAmount,
    discount_amount: payload.discountAmount,
    total_amount: totalAmount,
    paid_amount: 0,
    due_amount: totalAmount,
    issued_at: payload.issuedAt ?? new Date().toISOString(),
    due_at: payload.dueAt ?? null,
    billing_period_start: payload.billingPeriodStart ?? null,
    billing_period_end: payload.billingPeriodEnd ?? null,
    metadata: payload.metadata ?? {},
  });

  await recordFinancialEvent({
    organizationId: payload.organizationId,
    eventType: "financial.billing.invoice_issued",
    aggregateType: "invoice",
    aggregateId: String(invoice.id),
    sourceDomain: "billing",
    payload: {
      invoiceNumber,
      totalAmount,
      currencyCode: payload.currencyCode,
    },
  });

  return invoice;
}

export async function listBillingPlans(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_billing_plans", organizationId);
}

export async function createBillingPlan(payload: {
  organizationId: string;
  code: string;
  name: string;
  billingType: "subscription" | "one_time" | "manual" | "enterprise_contract";
  intervalUnit?: "monthly" | "quarterly" | "yearly" | "lifetime";
  intervalCount?: number;
  amount: number;
  currencyCode: string;
  trialDays?: number;
  gracePeriodDays?: number;
  autoRenewDefault?: boolean;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_billing_plans", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    billing_type: payload.billingType,
    interval_unit: payload.intervalUnit ?? null,
    interval_count: payload.intervalCount ?? null,
    amount: payload.amount,
    currency_code: payload.currencyCode,
    trial_days: payload.trialDays ?? 0,
    grace_period_days: payload.gracePeriodDays ?? 0,
    auto_renew_default: payload.autoRenewDefault ?? true,
    metadata: payload.metadata ?? {},
  });
}

export async function listSubscriptions(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_subscriptions", organizationId);
}

export async function createSubscription(payload: {
  organizationId: string;
  accountId: string;
  planId: string;
  subscriberType: "employer" | "candidate" | "partner" | "enterprise" | "platform";
  subscriberReference: string;
  status: "trialing" | "active" | "grace" | "past_due" | "paused" | "cancelled" | "expired";
  startsAt: string;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  graceEndsAt?: string;
  autoRenew?: boolean;
  renewalMode?: "auto" | "manual";
  externalContractRef?: string;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_subscriptions", {
    organization_id: payload.organizationId,
    account_id: payload.accountId,
    plan_id: payload.planId,
    subscriber_type: payload.subscriberType,
    subscriber_reference: payload.subscriberReference,
    status: payload.status,
    starts_at: payload.startsAt,
    trial_ends_at: payload.trialEndsAt ?? null,
    current_period_start: payload.currentPeriodStart ?? null,
    current_period_end: payload.currentPeriodEnd ?? null,
    grace_ends_at: payload.graceEndsAt ?? null,
    auto_renew: payload.autoRenew ?? true,
    renewal_mode: payload.renewalMode ?? "auto",
    external_contract_ref: payload.externalContractRef ?? null,
    metadata: payload.metadata ?? {},
  });
}

export async function listPaymentProviders() {
  return listRows<Record<string, unknown>>("pgems_payment_providers");
}

export async function listPaymentIntents(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_payment_intents", organizationId);
}

export async function createPaymentIntent(payload: {
  organizationId: string;
  accountId: string;
  invoiceId?: string;
  providerConfigId?: string;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  status?: "requires_payment_method" | "requires_confirmation" | "processing" | "succeeded" | "failed" | "cancelled";
  paymentMethodType?: string;
  externalIntentId?: string;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_payment_intents", {
    organization_id: payload.organizationId,
    account_id: payload.accountId,
    invoice_id: payload.invoiceId ?? null,
    provider_config_id: payload.providerConfigId ?? null,
    amount: payload.amount,
    currency_code: payload.currencyCode,
    status: payload.status ?? "requires_payment_method",
    idempotency_key: payload.idempotencyKey,
    external_intent_id: payload.externalIntentId ?? null,
    payment_method_type: payload.paymentMethodType ?? null,
    metadata: payload.metadata ?? {},
  });
}

export async function listPayments(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_payments", organizationId);
}

export async function createPayment(payload: {
  organizationId: string;
  accountId: string;
  paymentIntentId?: string;
  invoiceId?: string;
  providerConfigId?: string;
  paymentChannel: "card" | "bank_transfer" | "wallet" | "manual" | "cash" | "other";
  amount: number;
  currencyCode: string;
  status: "pending" | "authorized" | "captured" | "settled" | "failed" | "cancelled" | "refunded" | "partially_refunded";
  externalPaymentId?: string;
  metadata?: Record<string, unknown>;
}) {
  const payment = await createRow<Record<string, unknown>>("pgems_payments", {
    organization_id: payload.organizationId,
    payment_intent_id: payload.paymentIntentId ?? null,
    invoice_id: payload.invoiceId ?? null,
    account_id: payload.accountId,
    provider_config_id: payload.providerConfigId ?? null,
    payment_channel: payload.paymentChannel,
    amount: payload.amount,
    currency_code: payload.currencyCode,
    status: payload.status,
    external_payment_id: payload.externalPaymentId ?? null,
    metadata: payload.metadata ?? {},
  });

  await recordFinancialEvent({
    organizationId: payload.organizationId,
    eventType: "financial.payment.recorded",
    aggregateType: "payment",
    aggregateId: String(payment.id),
    sourceDomain: "payments",
    payload: {
      status: payload.status,
      amount: payload.amount,
      currencyCode: payload.currencyCode,
    },
  });

  return payment;
}

export async function listCommissionPolicies(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_commission_policies", organizationId);
}

export async function createCommissionPolicy(payload: {
  organizationId: string;
  code: string;
  name: string;
  commissionType: "employer" | "recruitment" | "partner" | "referral" | "marketplace";
  basis: "percentage" | "flat" | "tiered";
  rate?: number;
  flatAmount?: number;
  currencyCode?: string;
  minAmount?: number;
  maxAmount?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_commission_policies", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    commission_type: payload.commissionType,
    basis: payload.basis,
    rate: payload.rate ?? null,
    flat_amount: payload.flatAmount ?? null,
    currency_code: payload.currencyCode ?? null,
    min_amount: payload.minAmount ?? null,
    max_amount: payload.maxAmount ?? null,
    effective_from: payload.effectiveFrom,
    effective_to: payload.effectiveTo ?? null,
    metadata: payload.metadata ?? {},
  });
}

export async function listCommissionRecords(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_commission_records", organizationId);
}

export async function createCommissionRecord(payload: {
  organizationId: string;
  policyId: string;
  sourceDomain: string;
  sourceReference: string;
  baseAmount: number;
  commissionAmount: number;
  currencyCode: string;
  beneficiaryType: "platform" | "partner" | "referrer" | "recruiter";
  beneficiaryReference?: string;
  status: "calculated" | "accrued" | "payable" | "paid" | "reversed";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_commission_records", {
    organization_id: payload.organizationId,
    policy_id: payload.policyId,
    source_domain: payload.sourceDomain,
    source_reference: payload.sourceReference,
    base_amount: payload.baseAmount,
    commission_amount: payload.commissionAmount,
    currency_code: payload.currencyCode,
    beneficiary_type: payload.beneficiaryType,
    beneficiary_reference: payload.beneficiaryReference ?? null,
    status: payload.status,
    metadata: payload.metadata ?? {},
  });
}

export async function listTaxRegimes(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_tax_regimes", organizationId);
}

export async function createTaxRegime(payload: {
  organizationId: string;
  code: string;
  name: string;
  countryCode: string;
  taxKind: "vat" | "gst" | "sales_tax" | "withholding" | "other";
  adapterCode: string;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_tax_regimes", {
    organization_id: payload.organizationId,
    code: payload.code,
    name: payload.name,
    country_code: payload.countryCode,
    tax_kind: payload.taxKind,
    adapter_code: payload.adapterCode,
    metadata: payload.metadata ?? {},
  });
}

export async function listTaxRules(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_tax_rules", organizationId);
}

export async function createTaxRule(payload: {
  organizationId: string;
  regimeId: string;
  code: string;
  name: string;
  rate: number;
  appliesTo: string;
  effectiveFrom: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_tax_rules", {
    organization_id: payload.organizationId,
    regime_id: payload.regimeId,
    code: payload.code,
    name: payload.name,
    rate: payload.rate,
    applies_to: payload.appliesTo,
    effective_from: payload.effectiveFrom,
    effective_to: payload.effectiveTo ?? null,
    metadata: payload.metadata ?? {},
  });
}

export async function listCurrencies() {
  return listRows<Record<string, unknown>>("pgems_currency_definitions");
}

export async function listExchangeRates() {
  return listRows<Record<string, unknown>>("pgems_exchange_rate_snapshots");
}

export async function createExchangeRateSnapshot(payload: {
  providerCode: string;
  baseCurrencyCode: string;
  quoteCurrencyCode: string;
  rate: number;
  asOf: string;
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_exchange_rate_snapshots", {
    provider_code: payload.providerCode,
    base_currency_code: payload.baseCurrencyCode,
    quote_currency_code: payload.quoteCurrencyCode,
    rate: payload.rate,
    as_of: payload.asOf,
    metadata: payload.metadata ?? {},
  });
}

export async function listReconciliationBatches(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_reconciliation_batches", organizationId);
}

export async function createReconciliationBatch(payload: {
  organizationId: string;
  providerConfigId?: string;
  code: string;
  status: "draft" | "in_progress" | "matched" | "mismatched" | "resolved" | "closed";
  periodStart?: string;
  periodEnd?: string;
  summary?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_reconciliation_batches", {
    organization_id: payload.organizationId,
    provider_config_id: payload.providerConfigId ?? null,
    code: payload.code,
    status: payload.status,
    period_start: payload.periodStart ?? null,
    period_end: payload.periodEnd ?? null,
    summary: payload.summary ?? {},
  });
}

export async function listDisputes(organizationId: string) {
  return listRows<Record<string, unknown>>("pgems_financial_disputes", organizationId);
}

export async function createDispute(payload: {
  organizationId: string;
  paymentId?: string;
  invoiceId?: string;
  code: string;
  reason?: string;
  status: "opened" | "under_review" | "won" | "lost" | "settled" | "cancelled";
  metadata?: Record<string, unknown>;
}) {
  return createRow<Record<string, unknown>>("pgems_financial_disputes", {
    organization_id: payload.organizationId,
    payment_id: payload.paymentId ?? null,
    invoice_id: payload.invoiceId ?? null,
    code: payload.code,
    reason: payload.reason ?? null,
    status: payload.status,
    metadata: payload.metadata ?? {},
  });
}

export async function listFinancialEvents(organizationId?: string) {
  return listRows<Record<string, unknown>>("pgems_financial_events", organizationId);
}
