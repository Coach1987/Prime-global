export type FinancialAccountType =
  | "corporate_ledger"
  | "customer_account"
  | "employer_account"
  | "candidate_wallet"
  | "internal_treasury"
  | "revenue_account"
  | "expense_account"
  | "tax_account"
  | "reserve_account"
  | "refund_account"
  | "commission_account";

export type BillingIntervalUnit = "monthly" | "quarterly" | "yearly" | "lifetime";

export type SubscriptionRenewalMode = "auto" | "manual";

export type PaymentProviderCode =
  | "stripe"
  | "paypal"
  | "moyasar"
  | "hyperpay"
  | "checkout_com"
  | "paytabs"
  | "bank_transfer"
  | "manual"
  | "cash";

export type CommissionType = "employer" | "recruitment" | "partner" | "referral" | "marketplace";

export type FinancialPermissionCode =
  | "financial.accounts.read"
  | "financial.accounts.write"
  | "financial.ledger.post"
  | "financial.ledger.void"
  | "financial.invoices.read"
  | "financial.invoices.issue"
  | "financial.invoices.adjust"
  | "financial.subscriptions.manage"
  | "financial.payments.manage"
  | "financial.refunds.manage"
  | "financial.disputes.manage"
  | "financial.reconciliation.manage"
  | "financial.tax.manage"
  | "financial.commission.manage"
  | "financial.audit.read"
  | "financial.approvals.manage";

export interface PaymentProviderAdapter {
  providerCode: PaymentProviderCode;
  createPaymentIntent(input: {
    amount: number;
    currencyCode: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ externalIntentId: string; status: string; metadata?: Record<string, unknown> }>;
  capturePayment(input: {
    externalIntentId: string;
    amount?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ externalPaymentId: string; status: string; metadata?: Record<string, unknown> }>;
  refundPayment(input: {
    externalPaymentId: string;
    amount: number;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ externalRefundId: string; status: string; metadata?: Record<string, unknown> }>;
}

export interface ExchangeRateProviderAdapter {
  providerCode: string;
  getRate(input: {
    baseCurrencyCode: string;
    quoteCurrencyCode: string;
    asOf?: string;
  }): Promise<{ rate: number; asOf: string; metadata?: Record<string, unknown> }>;
}

export interface TaxProviderAdapter {
  adapterCode: string;
  calculateTax(input: {
    countryCode: string;
    regimeCode: string;
    taxRuleCode?: string;
    amount: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ taxAmount: number; effectiveRate: number; metadata?: Record<string, unknown> }>;
}

export interface FinancialEventInput {
  organizationId?: string;
  eventType: string;
  eventVersion?: number;
  aggregateType: string;
  aggregateId: string;
  sourceDomain: string;
  sourceReference?: string;
  actorAuthUserId?: string;
  actorRole?: string;
  correlationId?: string;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface JournalLine {
  accountId: string;
  entryType: "debit" | "credit";
  amount: number;
  currencyCode: string;
  exchangeRate?: number;
  baseAmount?: number;
  lineDescription?: string;
  metadata?: Record<string, unknown>;
}

export interface JournalBalanceResult {
  balanced: boolean;
  debitTotal: number;
  creditTotal: number;
}
