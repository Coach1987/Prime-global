import { z } from "zod";

const codeSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9_.:-]+$/i);
const nameSchema = z.string().trim().min(2).max(180);
const currencySchema = z.string().trim().length(3).transform((value) => value.toUpperCase());
const metadataSchema = z.record(z.unknown()).default({});

export const listByOrganizationFinancialQuerySchema = z.object({
  organizationId: z.string().uuid(),
});

export const createFinancialAccountSchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  accountType: z.enum([
    "corporate_ledger",
    "customer_account",
    "employer_account",
    "candidate_wallet",
    "internal_treasury",
    "revenue_account",
    "expense_account",
    "tax_account",
    "reserve_account",
    "refund_account",
    "commission_account",
  ]),
  naturalBalance: z.enum(["debit", "credit"]).default("debit"),
  currencyCode: currencySchema,
  parentAccountId: z.string().uuid().optional(),
  isSystem: z.boolean().default(false),
  metadata: metadataSchema,
});

export const createJournalWithEntriesSchema = z.object({
  organizationId: z.string().uuid(),
  journalNumber: z.string().trim().min(2).max(120),
  sourceDomain: codeSchema,
  sourceReference: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  journalDate: z.string().date().optional(),
  currencyCode: currencySchema,
  lines: z.array(
    z.object({
      accountId: z.string().uuid(),
      entryType: z.enum(["debit", "credit"]),
      amount: z.number().positive(),
      currencyCode: currencySchema,
      exchangeRate: z.number().positive().optional(),
      baseAmount: z.number().positive().optional(),
      lineDescription: z.string().trim().max(500).optional(),
      metadata: metadataSchema,
    })
  ).min(2),
});

export const createBillingPlanSchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  billingType: z.enum(["subscription", "one_time", "manual", "enterprise_contract"]),
  intervalUnit: z.enum(["monthly", "quarterly", "yearly", "lifetime"]).optional(),
  intervalCount: z.number().int().positive().max(120).optional(),
  amount: z.number().nonnegative(),
  currencyCode: currencySchema,
  trialDays: z.number().int().min(0).max(365).default(0),
  gracePeriodDays: z.number().int().min(0).max(365).default(0),
  autoRenewDefault: z.boolean().default(true),
  metadata: metadataSchema,
});

export const createSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  accountId: z.string().uuid(),
  planId: z.string().uuid(),
  subscriberType: z.enum(["employer", "candidate", "partner", "enterprise", "platform"]),
  subscriberReference: z.string().trim().min(2).max(160),
  status: z.enum(["trialing", "active", "grace", "past_due", "paused", "cancelled", "expired"]),
  startsAt: z.string().datetime(),
  trialEndsAt: z.string().datetime().optional(),
  currentPeriodStart: z.string().datetime().optional(),
  currentPeriodEnd: z.string().datetime().optional(),
  graceEndsAt: z.string().datetime().optional(),
  autoRenew: z.boolean().default(true),
  renewalMode: z.enum(["auto", "manual"]).default("auto"),
  externalContractRef: z.string().trim().max(160).optional(),
  metadata: metadataSchema,
});

export const createInvoiceSchema = z.object({
  organizationId: z.string().uuid(),
  accountId: z.string().uuid(),
  subscriptionId: z.string().uuid().optional(),
  invoiceType: z.enum(["recurring", "one_time", "manual", "proforma"]),
  currencyCode: currencySchema,
  subtotalAmount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  issuedAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
  billingPeriodStart: z.string().datetime().optional(),
  billingPeriodEnd: z.string().datetime().optional(),
  metadata: metadataSchema,
});

export const createPaymentIntentSchema = z.object({
  organizationId: z.string().uuid(),
  accountId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  providerConfigId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currencyCode: currencySchema,
  idempotencyKey: z.string().trim().min(4).max(200),
  status: z.enum(["requires_payment_method", "requires_confirmation", "processing", "succeeded", "failed", "cancelled"]).default("requires_payment_method"),
  paymentMethodType: z.string().trim().max(80).optional(),
  externalIntentId: z.string().trim().max(160).optional(),
  metadata: metadataSchema,
});

export const createPaymentSchema = z.object({
  organizationId: z.string().uuid(),
  accountId: z.string().uuid(),
  paymentIntentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  providerConfigId: z.string().uuid().optional(),
  paymentChannel: z.enum(["card", "bank_transfer", "wallet", "manual", "cash", "other"]),
  amount: z.number().positive(),
  currencyCode: currencySchema,
  status: z.enum(["pending", "authorized", "captured", "settled", "failed", "cancelled", "refunded", "partially_refunded"]),
  externalPaymentId: z.string().trim().max(160).optional(),
  metadata: metadataSchema,
});

export const createCommissionPolicySchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  commissionType: z.enum(["employer", "recruitment", "partner", "referral", "marketplace"]),
  basis: z.enum(["percentage", "flat", "tiered"]),
  rate: z.number().nonnegative().optional(),
  flatAmount: z.number().nonnegative().optional(),
  currencyCode: currencySchema.optional(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().nonnegative().optional(),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  metadata: metadataSchema,
});

export const createCommissionRecordSchema = z.object({
  organizationId: z.string().uuid(),
  policyId: z.string().uuid(),
  sourceDomain: codeSchema,
  sourceReference: z.string().trim().min(2).max(160),
  baseAmount: z.number().nonnegative(),
  commissionAmount: z.number().nonnegative(),
  currencyCode: currencySchema,
  beneficiaryType: z.enum(["platform", "partner", "referrer", "recruiter"]),
  beneficiaryReference: z.string().trim().max(160).optional(),
  status: z.enum(["calculated", "accrued", "payable", "paid", "reversed"]),
  metadata: metadataSchema,
});

export const createTaxRegimeSchema = z.object({
  organizationId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  countryCode: z.string().trim().min(2).max(10).transform((value) => value.toUpperCase()),
  taxKind: z.enum(["vat", "gst", "sales_tax", "withholding", "other"]),
  adapterCode: codeSchema,
  metadata: metadataSchema,
});

export const createTaxRuleSchema = z.object({
  organizationId: z.string().uuid(),
  regimeId: z.string().uuid(),
  code: codeSchema,
  name: nameSchema,
  rate: z.number().nonnegative(),
  appliesTo: z.string().trim().min(2).max(120),
  effectiveFrom: z.string().datetime(),
  effectiveTo: z.string().datetime().optional(),
  metadata: metadataSchema,
});

export const createExchangeRateSnapshotSchema = z.object({
  providerCode: codeSchema,
  baseCurrencyCode: currencySchema,
  quoteCurrencyCode: currencySchema,
  rate: z.number().positive(),
  asOf: z.string().datetime(),
  metadata: metadataSchema,
});

export const createReconciliationBatchSchema = z.object({
  organizationId: z.string().uuid(),
  providerConfigId: z.string().uuid().optional(),
  code: codeSchema,
  status: z.enum(["draft", "in_progress", "matched", "mismatched", "resolved", "closed"]),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  summary: metadataSchema,
});

export const createDisputeSchema = z.object({
  organizationId: z.string().uuid(),
  paymentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  code: codeSchema,
  reason: z.string().trim().max(2000).optional(),
  status: z.enum(["opened", "under_review", "won", "lost", "settled", "cancelled"]),
  metadata: metadataSchema,
});
