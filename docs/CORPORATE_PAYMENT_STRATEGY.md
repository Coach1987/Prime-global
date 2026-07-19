# PRIME GLOBAL Corporate Payment & Billing Strategy

## Mission Boundary

This document defines the enterprise payment and billing strategy foundation for Prime Global.

In scope:
- Enterprise billing and payment operating model
- Provider abstraction strategy
- Multi-provider evaluation and rollout strategy
- Wallet, currency, tax, refund, and compliance strategy

Out of scope:
- Payment gateway integration implementation
- Frontend checkout or billing UI
- Hardcoded payment-provider-specific logic in domain code

## 1) Corporate Billing Strategy

Prime Global billing model should remain multi-domain and product-line aware:

- Subscriptions:
  - Employer subscriptions
  - Future SaaS plans (tiered + usage-addons ready)
  - Billing cycles: monthly, quarterly, yearly, enterprise contract
- One-time payments:
  - Job promotion boosts
  - Premium one-off recruitment services
  - Logistics transaction-specific fees
- Enterprise contracts:
  - Contract-bound invoicing and negotiated pricing
  - Manual + automated hybrid invoicing workflow
- Recruitment commissions:
  - Placement fee model
  - Milestone-based commission release support
- Business development commissions:
  - Partnership and referral commission streams
- Logistics payments:
  - Service-order linked settlement and dispute model

Recommended billing engine behavior:
- Keep invoice generation provider-agnostic
- Separate invoicing from payment execution
- Keep commissions and tax as explicit line-level derivations
- Preserve immutable financial events for all billing transitions

## 2) Corporate Payment Architecture

### Core architecture principles
- Provider abstraction first
- No gateway lock-in
- Multi-provider routing and failover readiness
- Country-aware payment method orchestration
- Reconciliation and audit by design

### Target architecture layers
- Domain layer:
  - Billing, subscriptions, payments, refunds, disputes
- Adapter layer:
  - Gateway-specific connectors behind common interfaces
- Routing layer:
  - Provider selection by country, currency, risk, cost, and channel
- Reliability layer:
  - Retry policy, fallback provider routing, idempotency, dead-letter handling
- Governance layer:
  - Audit events, approvals, compliance controls

### Provider failover strategy
- Primary provider per country/currency combination
- Secondary provider fallback for hard failures and degraded latency
- Policy-based failover thresholds:
  - error-rate threshold
  - timeout threshold
  - explicit provider outage signal

### Future expansion strategy
- Introduce providers through adapter registration only
- Keep one canonical payment intent lifecycle across all providers
- Use feature flags for controlled provider rollout per region

## 3) Payment Providers Evaluation

### Evaluation matrix summary
- Stripe:
  - Pros: strong APIs, subscriptions, ecosystem maturity
  - Cons: regional coverage and costs vary by market
- PayPal:
  - Pros: global consumer trust, broad wallet usage
  - Cons: weaker enterprise control for some flows
- HyperPay:
  - Pros: strong MENA fit and local rails support
  - Cons: integration complexity can vary by acquiring setup
- Moyasar:
  - Pros: Saudi-centric alignment and local convenience
  - Cons: narrower international scope than global processors
- PayTabs:
  - Pros: regional coverage and local business familiarity
  - Cons: feature depth differences by market/account type
- Checkout.com:
  - Pros: enterprise-grade orchestration and global acquiring
  - Cons: commercial terms can be premium at lower scale
- Adyen:
  - Pros: global enterprise scale, unified platform strength
  - Cons: may be operationally heavy for early-phase deployment
- Bank Transfer:
  - Pros: low processing cost, B2B contract suitability
  - Cons: slower settlement and manual reconciliation overhead
- Manual Payment:
  - Pros: supports contract exceptions and fallback scenarios
  - Cons: high operational overhead and control requirements

### Recommended provider strategy
- Primary global architecture baseline:
  - Stripe + Checkout.com class adapters for global card flows
- MENA optimization track:
  - HyperPay/Moyasar/PayTabs adapters by country fit
- Enterprise contract and fallback:
  - Bank transfer + manual payment controlled workflows
- Long-term enterprise expansion:
  - Add Adyen adapter when scale, geography, and cost profile justify

## 4) Corporate Wallet Strategy

Wallet model should support segregated accounting ledgers:

- Employer balances:
  - Prepaid credits
  - Reserved funds for pending invoices
- Internal treasury:
  - Operating liquidity and settlement accounting
- Refund accounts:
  - Controlled refund outflow pool with approval hooks
- Reserve accounts:
  - Risk reserve, chargeback reserve, and dispute reserve
- Future candidate wallet:
  - Deferred capability for stipends, rewards, or payouts

Design requirements:
- Explicit double-entry alignment
- Per-wallet currency support
- Reconciliation linkage to payments and refunds
- Full audit history and immutable event logging

## 5) Currency Strategy

Initial strategic currency baseline:
- USD
- EUR
- SAR
- AED
- QAR
- KWD
- BHD
- OMR
- TND

Currency architecture principles:
- Store transactional amounts in currency + base currency where required
- Maintain FX snapshot references for conversion traceability
- Keep decimal precision in currency definitions
- Avoid hardcoded currency assumptions in domain logic
- Enable future currency additions through configuration, not code redesign

## 6) Tax Strategy

Tax architecture should remain country-abstract and rules-driven:
- VAT support
- GST support
- Country-specific rule sets through configurable regimes
- Effective date windows for changing rules
- Manual override and review pathways for exceptional cases

Compliance design priorities:
- Tax derivation transparency at invoice-line level
- Explainable tax calculations
- Immutable tax-relevant audit events

## 7) Refund Strategy

Refund model requirements:
- Full refunds
- Partial refunds
- Multi-refund per transaction support
- Manual review queue for high-risk refunds
- Dispute-aware refund blocking/hold policies

Operational controls:
- Approval thresholds by amount/risk/role
- Idempotent refund execution
- Refund reason taxonomy and audit trails
- Reconciliation integration for settlement confirmation

## 8) Compliance Strategy

### PCI DSS readiness
- Tokenized payment handling only
- Avoid raw card data persistence in platform domain
- Segregate sensitive operations and key management

### AML hooks
- Risk scoring hooks for unusual payment patterns
- Alerting and review workflows for suspicious transactions

### KYC hooks
- Identity and business verification state linkage before high-risk payment actions
- Escalation paths for restricted transaction types

### Audit readiness
- Immutable event streams across payment lifecycle
- Correlation IDs for cross-service tracing
- Role-based access and approval records

## Recommended Rollout Plan

Phase A: Foundation hardening
- Keep provider abstraction and billing core stable
- Finalize routing policy schema and failover rules

Phase B: Controlled pilot (single country + limited methods)
- Enable one primary provider + bank transfer fallback
- Tight reconciliation and incident monitoring

Phase C: Regional scale-out
- Expand to Gulf currencies and country-based provider routing
- Enable secondary provider failover in production

Phase D: Enterprise optimization
- Introduce advanced routing (cost + latency + success-rate aware)
- Add provider diversity for resilience and commercial leverage

## Country Coverage Strategy

- Gulf-first coverage:
  - Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman
- Regional expansion:
  - North Africa and broader MENA as local rails mature
- Global expansion:
  - USD/EUR corridors via globally supported providers

## Scalability Assessment

Architecture scalability readiness: High

Reasons:
- Provider abstraction avoids lock-in
- Multi-currency and tax abstractions already modeled
- Event-based audit patterns support high-scale operations
- Financial domain separation supports product-line growth

## Estimated Operational Cost Bands (Strategic Planning Level)

These are strategy-level planning bands, not contractual quotes.

- Gateway processing costs:
  - Typical blended range: 2.0% to 4.0% + fixed fee per transaction depending on country/card type/provider mix
- Operations and reconciliation overhead:
  - Low at single-provider scale, medium-high with multi-provider expansion unless automated controls mature
- Compliance overhead:
  - Increases with market expansion and higher transaction volume

Cost-optimization levers:
- Smart provider routing by success rate and effective processing cost
- Bank transfer for high-ticket B2B contract flows
- Automated reconciliation and dispute tooling to reduce manual effort

## Future Roadmap

Near term:
- Finalize provider scoring model (cost, coverage, reliability)
- Define routing policy schema and failover runbooks

Mid term:
- Add adaptive routing by region/currency/risk
- Strengthen dispute and chargeback analytics

Long term:
- Unified treasury optimization and liquidity controls
- AI-assisted payment anomaly detection and cost routing
- Extended payout and candidate-wallet capabilities

## Final Strategy Recommendation

Prime Global should adopt a multi-provider, provider-agnostic, event-audited payment architecture with Gulf-first regional optimization and global expansion readiness. The current financial foundation is structurally aligned with this strategy and can support phased integration without architectural redesign.
