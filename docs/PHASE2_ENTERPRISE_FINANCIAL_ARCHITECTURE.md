# Prime Global Enterprise Financial Layer (Phase 2)

## Mission Scope

Phase 2 introduces the enterprise financial backbone for the Prime Global ecosystem.

Included:
- Enterprise financial account model
- Corporate ledger and journal architecture
- Billing engine foundation
- Subscription engine foundation
- Payment provider abstraction
- Commission engine foundation
- Tax abstraction and rules
- Multi-currency architecture
- Financial audit and immutable financial event model
- Internal-only APIs for enterprise operations

Explicitly excluded:
- Payment page UI
- Checkout UX
- Billing frontend redesign
- Customer-facing invoicing interfaces

## Enterprise Financial Architecture

The financial layer is organized as composable domains:

1. Financial Accounts and Ledger Domain
- Financial accounts by type (corporate ledger, customer/employer accounts, candidate wallet ready, treasury, revenue, expense, tax, reserve, refund, commission)
- Journal headers and journal entries
- Double-entry balance guard at application layer before posting journals
- Journal posting emits immutable financial event

2. Billing and Invoicing Domain
- Billing plans (subscription, one-time, manual, enterprise contract)
- Billing intervals (monthly, quarterly, yearly, lifetime)
- Subscription lifecycle (trial, active, grace, past due, paused, cancelled, expired)
- Invoices with sequence-based invoice numbering and unique invoice IDs
- Credit note, debit note, refund note tables for adjustments and reversals

3. Payment Domain
- Provider registry + adapter interface
- Provider configuration per organization and mode (test/live)
- Payment intent model separated from payment settlement records
- Refund tracking model
- Provider-agnostic internal APIs and services (no provider business logic in domain)

4. Commission Domain
- Commission policies by type (employer, recruitment, partner, referral, marketplace)
- Commission basis support (percentage, flat, tiered)
- Commission records lifecycle (calculated, accrued, payable, paid, reversed)

5. Tax Domain
- Tax regime abstraction (VAT, GST, sales tax, withholding, other)
- Country-aware regime model
- Tax rule version windows (effective_from/effective_to)
- Adapter code abstraction (no hardcoded per-country tax logic)

6. Currency and FX Domain
- Currency definitions table with decimal precision
- Exchange rate snapshots with provider abstraction contract
- Multi-currency support baseline: USD, EUR, SAR, AED, QAR, KWD, BHD, OMR, TND

7. Financial Control Domain
- Reconciliation batches
- Dispute tracking
- Financial approval policy metadata (authority and separation-of-duty ready)
- Immutable financial event stream for audit and compliance

## Database Model

Primary financial tables:
- pgems_financial_accounts
- pgems_financial_journals
- pgems_financial_journal_entries
- pgems_billing_plans
- pgems_subscriptions
- pgems_invoices
- pgems_invoice_lines
- pgems_billing_runs
- pgems_credit_notes
- pgems_debit_notes
- pgems_refund_notes
- pgems_payment_providers
- pgems_payment_provider_configs
- pgems_payment_intents
- pgems_payments
- pgems_payment_refunds
- pgems_commission_policies
- pgems_commission_records
- pgems_currency_definitions
- pgems_exchange_rate_snapshots
- pgems_tax_regimes
- pgems_tax_rules
- pgems_reconciliation_batches
- pgems_financial_disputes
- pgems_financial_approval_policies
- pgems_financial_events

Core supporting functions and controls:
- pgems_generate_invoice_number(organization_id)
- pgems_record_financial_event(...)
- Immutable trigger guard on pgems_financial_events updates/deletes

## Financial Ledger Model

Ledger architecture is double-entry ready:
- Journal-level posting entity
- Entry-level debit and credit lines
- Explicit account linkage per line
- Currency and base amount support for FX-aware posting
- Journal posting requires debit total equals credit total

Posting flow:
1. Validate lines are balanced.
2. Persist journal with posted status.
3. Persist journal entries.
4. Emit immutable event financial.ledger.journal_posted.

## Billing Architecture

Billing supports:
- Recurring billing through plans and subscriptions
- One-time billing via invoice_type one_time
- Manual billing via invoice_type manual
- Proforma invoices via invoice_type proforma
- Credit/debit/refund notes for reversals and adjustments

Invoice model includes:
- Invoice sequence number
- Human-readable invoice number
- Tax/discount split totals
- Due amount and paid amount tracking
- Period windows for recurring cycles

## Subscription Architecture

Subscription domain supports:
- Monthly, quarterly, yearly, lifetime plans
- Enterprise contract reference
- Trial and grace windows
- Auto renew and manual renew mode
- Current billing period boundaries

Lifecycle readiness:
- trialing -> active -> grace/past_due -> cancelled/expired

## Commission Architecture

Commission foundation includes:
- Policy abstraction for each commission type
- Basis abstraction for percentage/flat/tiered
- Effective windows for policy evolution
- Commission records for accrual and settlement workflows

Future-ready for marketplace expansion:
- Distinct marketplace commission type already modeled

## Payment Abstraction

Provider abstraction is implemented via adapter interfaces:
- PaymentProviderAdapter
- ExchangeRateProviderAdapter
- TaxProviderAdapter

Default behavior:
- No-op adapters that raise explicit not configured errors
- Registry-based provider resolution
- Pluggable overrides per provider code

Seeded provider registry entities:
- Stripe
- PayPal
- Moyasar
- HyperPay
- Checkout.com
- PayTabs
- Bank Transfer
- Manual
- Cash (future-flagged inactive)

## Tax Architecture

Tax architecture is adapter-driven:
- Regime identifies country and tax family (VAT/GST/other)
- Rule carries tax percentage and applicability scope
- Calculation logic delegated to adapter code
- No hardcoded country tax formulas in core services

## Financial Permission Matrix

Financial permission domains:
- financial.accounts.read / write
- financial.ledger.post / void
- financial.invoices.read / issue / adjust
- financial.subscriptions.manage
- financial.payments.manage
- financial.refunds.manage
- financial.disputes.manage
- financial.reconciliation.manage
- financial.tax.manage
- financial.commission.manage
- financial.audit.read
- financial.approvals.manage

Role mapping foundation includes Owner, CEO, CFO, COO, Super Admin, Department Manager, and Read Only Auditor profiles.

## Security and Audit

Security controls include:
- Internal enterprise access guard on all financial APIs
- CSRF enforcement on write APIs
- Rate limiting on read and write endpoints
- RLS enabled on financial tables
- Immutable financial event stream with mutation prevention triggers

Audit and compliance readiness:
- All major financial state transitions can emit immutable events
- Event schema supports actor, correlation, idempotency, and source metadata
- Reconciliation and dispute entities support investigation workflows

## Internal APIs

Financial internal APIs are exposed under:
- /api/enterprise/financial-layer/accounts
- /api/enterprise/financial-layer/ledger/journals
- /api/enterprise/financial-layer/billing/plans
- /api/enterprise/financial-layer/subscriptions
- /api/enterprise/financial-layer/invoices
- /api/enterprise/financial-layer/payments
- /api/enterprise/financial-layer/payments/intents
- /api/enterprise/financial-layer/payments/providers
- /api/enterprise/financial-layer/commissions
- /api/enterprise/financial-layer/commissions/policies
- /api/enterprise/financial-layer/taxes/regimes
- /api/enterprise/financial-layer/taxes/rules
- /api/enterprise/financial-layer/currencies
- /api/enterprise/financial-layer/currencies/exchange-rates
- /api/enterprise/financial-layer/reconciliation/batches
- /api/enterprise/financial-layer/disputes
- /api/enterprise/financial-layer/audit/events

## Future Growth AI Compatibility

The financial architecture is compatible with future Growth AI by design:
- Event stream can be consumed by AI anomaly/fraud detectors.
- Provider adapters enable AI-assisted smart routing without changing domain core.
- Tax/FX adapters allow AI optimization layers for rates and compliance recommendations.
- Reconciliation/dispute metadata supports AI-assisted exception handling.
- Commission policies support AI-driven simulation and pricing strategy analysis.
