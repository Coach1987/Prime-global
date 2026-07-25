# PRIME GLOBAL Corporate Email & Mailbox Strategy

## Mission Boundary

This document defines enterprise email governance, architecture, and rollout strategy for Prime Global.

In scope:
- Corporate mailbox naming and governance
- Provider strategy and recommendation
- Executive and department mailbox control model
- Employee lifecycle and identity linkage model
- Platform sender architecture and deliverability strategy
- Security, compliance, and Growth AI governance model

Out of scope:
- Microsoft 365 or Google Workspace implementation
- Real mailbox provisioning
- Frontend UI design
- DNS changes in this phase

## 1) Corporate Email Naming Strategy

### Domain model
- Primary human/corporate domain: `primeglobal.com`
- Transactional sender subdomain: `tx.primeglobal.com`
- Marketing sender subdomain: `marketing.primeglobal.com`
- Internal automation identity subdomain (non-human service identities): `ops.primeglobal.com`

### Identity classes and standards

- Executives (user mailboxes):
  - `owner@primeglobal.com`
  - `ceo@primeglobal.com`
  - `board@primeglobal.com` (group + moderated shared mailbox model)
- Permanent employees (user mailboxes):
  - `{first}.{last}@primeglobal.com`
  - fallback for collision: `{first}.{last}.{employeeIdSuffix}@primeglobal.com`
- Contractors (user mailboxes with explicit contractor marker):
  - `{first}.{last}.ext@primeglobal.com`
- Departments (shared mailboxes):
  - `hr@primeglobal.com`
  - `finance@primeglobal.com`
  - `legal@primeglobal.com`
  - `support@primeglobal.com`
  - `marketing@primeglobal.com`
  - `partnerships@primeglobal.com`
  - `security@primeglobal.com`
  - `privacy@primeglobal.com`
  - `compliance@primeglobal.com`
  - `ai@primeglobal.com`
  - `careers@primeglobal.com`
  - `jobs@primeglobal.com`
  - `billing@primeglobal.com`
  - `info@primeglobal.com`
- Service accounts / automated senders (service identities):
  - `no-reply@tx.primeglobal.com`
  - `security-alerts@tx.primeglobal.com`
  - `billing-notify@tx.primeglobal.com`
  - `invoices@tx.primeglobal.com`
  - `jobs-alerts@tx.primeglobal.com`
  - `interviews@tx.primeglobal.com`
  - `contracts@tx.primeglobal.com`
  - `support-bot@tx.primeglobal.com`
  - `campaigns@marketing.primeglobal.com`

### Address type classification

- User mailboxes:
  - `owner@primeglobal.com`, `ceo@primeglobal.com`, `{first}.{last}@primeglobal.com`, `{first}.{last}.ext@primeglobal.com`
- Shared mailboxes:
  - `hr@primeglobal.com`, `finance@primeglobal.com`, `billing@primeglobal.com`, `legal@primeglobal.com`, `support@primeglobal.com`, `careers@primeglobal.com`, `jobs@primeglobal.com`, `ai@primeglobal.com`
- Distribution groups:
  - `board@primeglobal.com`, `all-employees@primeglobal.com`, `leadership@primeglobal.com`, `incident-response@primeglobal.com`
- Aliases:
  - `hello@primeglobal.com` -> `info@primeglobal.com`
  - `accounts@primeglobal.com` -> `billing@primeglobal.com`
  - `recruitment@primeglobal.com` -> `careers@primeglobal.com`
- Service identities:
  - all `*@tx.primeglobal.com`, `*@marketing.primeglobal.com`, `*@ops.primeglobal.com`
- No-reply senders:
  - `no-reply@tx.primeglobal.com`, `notifications@tx.primeglobal.com`

## 2) Provider Evaluation

### Microsoft 365
- Security: strong Entra/conditional-access integration and mature enterprise controls
- Administration: rich enterprise admin center and role segmentation
- Shared mailboxes: mature delegated/shared mailbox support
- Compliance/audit/retention: strong legal hold, retention, and eDiscovery capability
- Integration: broad enterprise ecosystem and hybrid options
- Scalability: enterprise-proven at global scale
- Cost model: licensing can be higher for full compliance/security bundles
- Growth AI compatibility: strong policy controls for AI-assisted workflows and governance

### Google Workspace
- Security: strong baseline security and modern admin controls
- Administration: simpler operational model for smaller admin teams
- Shared mailboxes: workable via groups/delegation patterns, less native than some enterprise mailbox workflows
- Compliance/audit/retention: strong with higher tiers and add-ons
- Integration: excellent cloud SaaS interoperability
- Scalability: strong global operational reliability
- Cost model: often simpler pricing at some tiers, can increase with advanced compliance/security add-ons
- Growth AI compatibility: strong API ecosystem and workflow automation potential

### Future hybrid model
- Pattern: one primary corporate provider + specialized outbound channels (transactional/marketing)
- Advantage: resilience, vendor leverage, optimized workloads
- Risk: operational complexity and policy drift if governance is weak

### Final provider recommendation

Recommended baseline for Prime Global:
- Primary corporate mailbox platform: Microsoft 365
- Strategic secondary/hybrid readiness: Google Workspace interoperability path
- Keep outbound transactional and marketing senders abstracted from human mailbox provider decision

Reasoning:
- Executive governance and delegated mailbox controls align strongly with Microsoft 365 enterprise patterns.
- Compliance, retention, legal hold, and audit depth suit Prime Global enterprise trajectory.
- Hybrid-ready architecture preserves future optionality.

## 3) Executive Mailbox Governance

Governed identities:
- `owner@primeglobal.com`
- `ceo@primeglobal.com`
- `board@primeglobal.com`
- `recovery@primeglobal.com` (emergency-only break-glass mailbox)

Policies:
- Delegated access:
  - explicit delegated roles only
  - time-bound approvals for executive assistant access
- Executive assistant access:
  - read/send-on-behalf with strict scope and audit
- Break-glass recovery:
  - separate emergency mailbox with dual-approval access workflow
  - incident ticket + post-incident audit mandatory
- MFA requirements:
  - phishing-resistant MFA mandatory for all executive mailboxes
- Hardware security key readiness:
  - hardware key policy mandatory for Owner/CEO and recovery operators

## 4) Department Mailboxes

### Ownership and control matrix

- Human Resources: `hr@primeglobal.com`
  - Primary owner: HR Director
  - Backup owner: HR Operations Manager
- Recruitment: `careers@primeglobal.com`, `jobs@primeglobal.com`
  - Primary owner: Recruitment Director
  - Backup owner: Recruitment Operations Lead
- Finance: `finance@primeglobal.com`
  - Primary owner: CFO office delegate
  - Backup owner: Finance Operations Manager
- Billing: `billing@primeglobal.com`
  - Primary owner: Billing Lead
  - Backup owner: Finance Controller delegate
- Legal: `legal@primeglobal.com`
  - Primary owner: Legal Counsel Lead
  - Backup owner: Compliance Manager
- Support: `support@primeglobal.com`
  - Primary owner: Support Manager
  - Backup owner: Customer Success Lead
- Marketing: `marketing@primeglobal.com`
  - Primary owner: Marketing Director
  - Backup owner: Growth Marketing Manager
- Partnerships: `partnerships@primeglobal.com`
  - Primary owner: Partnerships Director
  - Backup owner: Business Development Manager
- Security: `security@primeglobal.com`
  - Primary owner: Security Lead
  - Backup owner: Security Operations Manager
- Privacy: `privacy@primeglobal.com`
  - Primary owner: Privacy Officer
  - Backup owner: Compliance Manager
- Compliance: `compliance@primeglobal.com`
  - Primary owner: Compliance Lead
  - Backup owner: Legal Operations Manager
- AI Operations: `ai@primeglobal.com`
  - Primary owner: AI Platform Lead
  - Backup owner: AI Operations Manager

Access roles for department shared mailboxes:
- Owner
- Manager
- Sender
- Viewer
- Auditor

Approval rules:
- New mailbox or ownership change: dual approval (department head + IT/Security)
- External forwarding enablement: Security approval mandatory
- Send-as rights for non-owners: manager + security approval

Audit requirements:
- Access changes logged with actor and approval reference
- Send-as/send-on-behalf events retained for audit period
- Quarterly access recertification required

## 5) Employee Email Identity Strategy

### Identity model
- Email identity tied to:
  - employee ID
  - role code
  - department ID
  - employment status
- Mailbox type linked to HR lifecycle state

### Lifecycle processes

- Joiner process:
  - identity created from HR source of truth
  - primary mailbox provision request generated
  - default groups and minimal access assignments applied
- Role-change process:
  - mailbox entitlements recalculated by role + department
  - shared mailbox access adjusted with audit trail
- Leaver process:
  - immediate sign-in suspension
  - mailbox delegated to manager/approved successor
  - retention hold applied per policy
- Suspension:
  - temporary sign-in block and send restriction
  - reversible via approved workflow
- Delegation:
  - time-bound delegation with explicit reason and approval
- Post-departure retention:
  - default retention window by policy class (HR/legal/compliance variants)
- Alias reassignment rules:
  - aliases are never reassigned immediately
  - quarantine window required before reuse
  - privileged aliases (executive/security/legal) are non-reassignable by default

## 6) Platform Email Architecture

Human mailboxes and automated sending must remain fully separated.

### Automated sender domains and use

Transactional sender domain: `tx.primeglobal.com`
- Account verification: `verify@tx.primeglobal.com`
- Password reset: `password-reset@tx.primeglobal.com`
- Security alerts: `security-alerts@tx.primeglobal.com`
- Billing notifications: `billing-notify@tx.primeglobal.com`
- Invoices: `invoices@tx.primeglobal.com`
- Job alerts: `jobs-alerts@tx.primeglobal.com`
- Interview notifications: `interviews@tx.primeglobal.com`
- Contract notifications: `contracts@tx.primeglobal.com`
- Support tickets: `support-bot@tx.primeglobal.com`

Marketing sender domain: `marketing.primeglobal.com`
- Marketing communication: `campaigns@marketing.primeglobal.com`
- Growth AI campaigns: `growth-ai@marketing.primeglobal.com`

### Reply-to policy
- No-reply transactional: reply-to routes to controlled support/shared mailbox when needed
- Billing/invoice senders: reply-to `billing@primeglobal.com`
- Support communications: reply-to `support@primeglobal.com`
- Marketing: dedicated unsubscribe and support reply paths

### Bounce/complaint/suppression strategy
- Central bounce event ingestion
- Complaint feedback loop ingestion
- Global suppression list + domain-level suppression policy
- Per-campaign suppression controls for marketing domain
- Delivery audit events persisted with correlation IDs

## 7) Domain and Deliverability Strategy

No DNS changes in this phase; architecture only.

Planned model:
- SPF:
  - strict authorized senders per domain/subdomain
- DKIM:
  - per-sender-domain signing keys with rotation policy
- DMARC:
  - staged enforcement rollout (`none` -> `quarantine` -> `reject`)
- BIMI readiness:
  - readiness track after DMARC enforcement maturity

Subdomain separation strategy:
- Human internal/corporate: `primeglobal.com`
- Transactional: `tx.primeglobal.com`
- Marketing: `marketing.primeglobal.com`

Controls:
- anti-spoofing policy enforcement
- phishing protection policy baseline
- domain reputation monitoring per sending domain

## 8) Security and Compliance Model

Baseline controls:
- MFA mandatory for all mailbox users
- Conditional access by risk, device trust, and role
- Least privilege for mailbox and admin access
- Admin role separation:
  - messaging admin
  - security admin
  - compliance admin
  - identity admin
- Centralized audit logs and immutable event capture
- Retention policy classes by mailbox type
- Legal hold readiness for executive/legal/compliance mailboxes
- DLP readiness and policy stubs
- Anti-phishing policy readiness
- Suspicious forwarding detection and alerting
- External sharing and auto-forwarding controls with approval gates

## 9) Growth AI Compatibility Rules

Growth AI may:
- Draft email content
- Submit draft for approval workflows
- Send only approved campaigns through approved service identities
- Access approved templates and campaign metadata
- Read campaign metrics in scoped analytics views

Growth AI may not by default:
- Access executive private mailboxes
- Access privileged legal/security private mailbox content
- Bypass approval workflows or compliance controls

Governance requirements:
- Least-privilege service identity for AI operations
- Explicit policy-based access grants only
- Complete audit logs for draft, approval, and send actions
- Correlation ID linkage between AI action, approval decision, and send event

## 10) Rollout Plan

### Phase A: Domain ownership and provider decision
- Confirm provider selection
- Finalize domain/subdomain architecture
- Finalize governance policies and control baselines

### Phase B: Executive and security mailboxes
- Provision executive/security governance model
- Enforce hardware-key and break-glass controls
- Validate audit and delegated access workflows

### Phase C: Department shared mailboxes
- Provision department shared mailboxes
- Apply ownership matrix and access role model
- Enable access recertification and audit workflows

### Phase D: Employee mailboxes
- Roll out employee identity-linked mailbox lifecycle processes
- Enforce joiner/mover/leaver controls

### Phase E: Transactional platform email
- Enable transactional sender identities and delivery controls
- Activate bounce/complaint/suppression governance

### Phase F: Marketing and Growth AI email
- Enable marketing sender domain and campaign governance
- Activate Growth AI constrained workflow with approvals and full audit

## Mailbox Inventory (Foundation)

Executive and corporate:
- `owner@primeglobal.com`
- `ceo@primeglobal.com`
- `board@primeglobal.com`
- `recovery@primeglobal.com`
- `info@primeglobal.com`

Department and shared:
- `careers@primeglobal.com`
- `jobs@primeglobal.com`
- `hr@primeglobal.com`
- `finance@primeglobal.com`
- `billing@primeglobal.com`
- `legal@primeglobal.com`
- `support@primeglobal.com`
- `marketing@primeglobal.com`
- `partnerships@primeglobal.com`
- `security@primeglobal.com`
- `privacy@primeglobal.com`
- `compliance@primeglobal.com`
- `ai@primeglobal.com`

Platform senders:
- `no-reply@tx.primeglobal.com`
- `verify@tx.primeglobal.com`
- `password-reset@tx.primeglobal.com`
- `security-alerts@tx.primeglobal.com`
- `billing-notify@tx.primeglobal.com`
- `invoices@tx.primeglobal.com`
- `jobs-alerts@tx.primeglobal.com`
- `interviews@tx.primeglobal.com`
- `contracts@tx.primeglobal.com`
- `support-bot@tx.primeglobal.com`
- `campaigns@marketing.primeglobal.com`
- `growth-ai@marketing.primeglobal.com`

## Estimated Cost Structure (Strategic)

These are strategic planning bands, not vendor quotes.

Cost components:
- Corporate mailbox licensing per user tier (executive/employee/contractor)
- Shared mailbox and compliance add-on licensing
- Security add-ons (conditional access, advanced anti-phishing)
- Archiving/legal hold/compliance retention cost tiers
- Transactional and marketing sender volume costs (separate from mailbox provider)
- Administration and operations overhead (identity, security, compliance)

Operational cost optimization levers:
- Keep human mailbox and platform sender domains operationally separated
- Apply role-based licensing policies and periodic license recertification
- Centralize governance automation for joiner/mover/leaver lifecycle

## Final Recommendation

Prime Global should adopt a Microsoft 365-first enterprise mailbox strategy with hybrid-ready architecture and strict separation between human mailboxes and platform-generated senders. This model best aligns with executive governance, compliance depth, secure delegated access, and controlled Growth AI integration while preserving future provider optionality.
