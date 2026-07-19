# PGEMS Architecture (Phase 1 + Phase 1.5)

## Scope

Phase 1 introduces the organization core foundation for enterprise operations.

Phase 1.5 extends that foundation with authority and governance architecture only. It introduces data structures and evaluation helpers without enabling approval workflow execution.

The combined Phase 1 and Phase 1.5 scope intentionally excludes AI workflow automation, approval execution engines, finance transaction processing, dashboards, notifications, and any modifications to candidate/employer recruitment or jobs systems.

Phase 1 corporate governance details are documented in docs/PHASE1_CORPORATE_GOVERNANCE.md.

Phase 2 enterprise financial layer details are documented in docs/PHASE2_ENTERPRISE_FINANCIAL_ARCHITECTURE.md.

Phase 3 enterprise communication layer details are documented in docs/PHASE3_ENTERPRISE_COMMUNICATION_ARCHITECTURE.md.

Phase 4 enterprise identity and security layer details are documented in docs/PHASE4_ENTERPRISE_IDENTITY_SECURITY_ARCHITECTURE.md.

Phase 5 enterprise observability and operations layer details are documented in docs/PHASE5_ENTERPRISE_OBSERVABILITY_OPERATIONS_ARCHITECTURE.md.

Phase 6 enterprise architecture review and consolidation details are documented in docs/PHASE6_ARCHITECTURE_REVIEW.md.

Corporate payment and billing strategy details are documented in docs/CORPORATE_PAYMENT_STRATEGY.md.

## Organization Model

The organization foundation is normalized with the following hierarchy:

- Organization (company)
- Division
- Department
- Team
- Position
- Employee

Structural guarantees:

- Each division belongs to one organization.
- Each department belongs to one division and one organization.
- Each team belongs to one department and one organization.
- Each position belongs to one department (and optionally one team) and one organization.
- Each employee belongs to exactly one position and one organization.

## Employee Hierarchy

Employees support recursive reporting lines through a self-reference:

- manager_employee_id -> pgems_employees.id

Capabilities:

- direct manager lookup
- direct reports listing
- unlimited-depth report traversal via BFS/graph traversal helpers
- upward manager chain reconstruction

## Dynamic Role System

Roles are data-driven entities scoped to an organization:

- pgems_roles

Design intent:

- no hardcoded business role logic
- supports seeded roles (Owner, Super Admin, Recruitment Director, etc.)
- supports custom future roles per organization without code changes

## Permission Infrastructure

Permissions are independent entities:

- pgems_permissions

Relationships:

- role -> permissions: pgems_role_permissions
- employee -> roles: pgems_employee_roles
- employee -> extra allow: pgems_employee_extra_permissions
- employee -> explicit deny: pgems_employee_denied_permissions

Evaluation order:

1. Explicit Deny
2. Explicit Allow
3. Role Permission
4. Default Deny

This order is implemented in a pure evaluation helper so future policy layers can compose on top of deterministic access decisions.

## Authority Level Model (Phase 1.5)

Authority level is a separate concept from role assignment.

- Roles represent capability bundles.
- Authority level represents organizational approval weight.

Design characteristics:

- organization-scoped authority definitions
- numeric authority values with support for custom overrides
- one authority assignment per employee
- no replacement of existing role-permission behavior

Example baseline values (configurable):

- Owner: 100
- Super Admin: 90
- Director: 70
- Manager: 40
- Supervisor: 20
- Employee: 10

## Approval Policy Foundation (Phase 1.5)

Approval policy entities define governance requirements per operation.

Each policy can define:

- minimum authority level
- optional required permission linkage
- optional scope requirement flag

This phase stores and evaluates policy metadata only. No approval execution pipeline is enabled.

## Monetary Authority Foundation (Phase 1.5)

Monetary authority is modeled as an employee-scoped approval limit:

- currency code
- maximum approval amount
- unlimited authority flag

Phase 1.5 provides limit evaluation helpers only. No finance processing behavior is introduced.

## Organizational Scope Foundation (Phase 1.5)

Scope is modeled as a dimension-node graph to support future expansion without schema redesign.

Examples of dimensions:

- country
- region
- branch
- business unit

Design characteristics:

- reusable scope dimensions
- organization-scoped hierarchical scope nodes
- employee-to-scope assignments
- future compatibility with additional dimensions and routing logic

## Delegation Foundation (Phase 1.5)

Delegation is modeled as time-bound authority transfer metadata.

Delegation structure includes:

- delegator
- delegate
- start timestamp
- end timestamp
- status
- allowed operations

Phase 1.5 provides infrastructure and advisory evaluation context. It does not activate delegation execution workflows.

## Governance Evaluation Extension (Phase 1.5)

Permission evaluation remains backward compatible.

Phase 1.5 adds advisory governance outputs that can be consumed by future workflow engines:

- existing permission decision (unchanged)
- authority threshold satisfaction
- scope requirement satisfaction
- delegation activity state
- monetary authority evaluation
- overall advisory readiness flag

This design preserves current access behavior while exposing structured governance context for later modules.

## APIs (Internal)

Internal enterprise endpoints are available under:

- /api/enterprise/organization-core/organizations
- /api/enterprise/organization-core/divisions
- /api/enterprise/organization-core/departments
- /api/enterprise/organization-core/teams
- /api/enterprise/organization-core/positions
- /api/enterprise/organization-core/employees
- /api/enterprise/organization-core/roles
- /api/enterprise/organization-core/permissions
- /api/enterprise/organization-core/roles/[roleId]/permissions
- /api/enterprise/organization-core/employees/[employeeId]/roles
- /api/enterprise/organization-core/employees/[employeeId]/permissions
- /api/enterprise/organization-core/employees/[employeeId]/hierarchy
- /api/enterprise/organization-core/authority-levels
- /api/enterprise/organization-core/employees/[employeeId]/authority
- /api/enterprise/organization-core/approval-operations
- /api/enterprise/organization-core/approval-policies
- /api/enterprise/organization-core/employees/[employeeId]/monetary-authority
- /api/enterprise/organization-core/scopes/dimensions
- /api/enterprise/organization-core/scopes/nodes
- /api/enterprise/organization-core/employees/[employeeId]/scopes
- /api/enterprise/organization-core/delegations
- /api/enterprise/organization-core/employees/[employeeId]/permissions/governance
- /api/enterprise/organization-core/governance/bootstrap
- /api/enterprise/organization-core/governance/controls
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
- /api/enterprise/communication-layer/mail-identities
- /api/enterprise/communication-layer/mailboxes
- /api/enterprise/communication-layer/mailboxes/members
- /api/enterprise/communication-layer/retention-policies
- /api/enterprise/communication-layer/templates
- /api/enterprise/communication-layer/templates/versions
- /api/enterprise/communication-layer/templates/localizations
- /api/enterprise/communication-layer/templates/approvals
- /api/enterprise/communication-layer/messaging
- /api/enterprise/communication-layer/messaging/acknowledge
- /api/enterprise/communication-layer/providers
- /api/enterprise/communication-layer/event-subscriptions
- /api/enterprise/communication-layer/deliveries
- /api/enterprise/communication-layer/compliance
- /api/enterprise/communication-layer/audit-events
- /api/enterprise/identity-security-layer/identities
- /api/enterprise/identity-security-layer/auth-methods
- /api/enterprise/identity-security-layer/mfa
- /api/enterprise/identity-security-layer/passkeys
- /api/enterprise/identity-security-layer/sessions
- /api/enterprise/identity-security-layer/sessions/revoke
- /api/enterprise/identity-security-layer/devices
- /api/enterprise/identity-security-layer/authorization
- /api/enterprise/identity-security-layer/authorization/delegations
- /api/enterprise/identity-security-layer/secrets
- /api/enterprise/identity-security-layer/secrets/rotate
- /api/enterprise/identity-security-layer/policies
- /api/enterprise/identity-security-layer/monitoring
- /api/enterprise/identity-security-layer/audit-events
- /api/enterprise/observability-operations-layer/monitoring
- /api/enterprise/observability-operations-layer/logging
- /api/enterprise/observability-operations-layer/metrics
- /api/enterprise/observability-operations-layer/tracing
- /api/enterprise/observability-operations-layer/health
- /api/enterprise/observability-operations-layer/incidents
- /api/enterprise/observability-operations-layer/incidents/timeline
- /api/enterprise/observability-operations-layer/feature-flags
- /api/enterprise/observability-operations-layer/configuration
- /api/enterprise/observability-operations-layer/disaster-recovery
- /api/enterprise/observability-operations-layer/performance
- /api/enterprise/observability-operations-layer/reliability
- /api/enterprise/observability-operations-layer/security-operations
- /api/enterprise/observability-operations-layer/audit-events

Access model:

- Uses existing authentication/session helpers.
- Uses internal role gate for enterprise/staff-capable roles.
- Does not modify authentication logic.

## Future Approval Engine Integration Points

Planned integration points (not implemented in Phase 1):

- role and permission checks can gate approval actions.
- authority thresholds can define operation eligibility.
- scope constraints can enforce organizational boundaries.
- delegation metadata can support temporary approval authority transfer.
- monetary limits can constrain financial approval ranges.
- organization hierarchy can define escalation chains (manager -> director -> executive).
- explicit deny rules can enforce separation-of-duties controls.

## Future Workflow Engine Boundary

Future workflow modules may consume Phase 1.5 governance foundations but must be implemented separately:

- approval request lifecycle orchestration
- multi-step approval routing and state transitions
- notification and reminder dispatch
- audit event streaming and operational dashboards
- integration with payroll, finance, and contract execution subsystems

None of the above workflow behaviors are enabled in Phase 1 or Phase 1.5.

## Workflow Engine Foundation (Phase 2)

Phase 2 introduces a generic approval workflow engine foundation. It is intentionally reusable and is not coupled to employees, finance, recruitment, contracts, companies, or AI execution.

The engine provides only metadata, state evaluation, rule evaluation, and immutable audit surfaces. It does not execute business workflows.

## Workflow Model

The workflow engine models the following reusable concepts:

- Workflow
- Workflow Type
- Workflow Instance
- Workflow Stage
- Workflow Action
- Workflow Participant
- Workflow Decision
- Workflow Rule
- Workflow Escalation
- Workflow Event
- Workflow History
- Workflow Attachment
- Workflow Comment
- Workflow Audit

## State Machine

Workflow state evaluation uses configurable transitions rather than hardcoded business logic.

Supported generic states:

- Draft
- Pending
- In Review
- Waiting Higher Approval
- Approved
- Rejected
- Returned
- Cancelled
- Expired
- Executed
- Archived

State transitions are stored as data and evaluated through pure helpers so future modules can define their own transition sets.

## Approval Steps

The engine supports reusable approval step modes as configuration metadata:

- single approval
- sequential approvals
- parallel approvals
- conditional approvals
- owner final approval
- authority level approval
- financial approval
- minimum authority policies
- future AI advisory approval

This phase stores and evaluates the step model only. It does not execute approvals.

## Workflow Rules

Rules are modeled as generic condition trees, not business-specific code.

Examples that the engine can represent:

- IF Amount > X
- IF Country = Saudi Arabia
- IF Employee Role = Manager
- IF Authority Level >= 80
- IF Workflow Type = Financial

Rules are evaluated from structured condition data so future modules can add new fields without schema redesign.

## Escalation

Escalation metadata supports reusable timers and reassignment concepts:

- automatic escalation
- timeout escalation
- manager escalation
- owner escalation
- delegation
- temporary reassignment
- reminder scheduling

The foundation records and evaluates escalation state only. It does not send reminders or trigger runtime job processing.

## Audit

Workflow events, history, and audit records are append-only foundations.

Requirements:

- every workflow action creates immutable event records
- workflow history is never deleted
- workflow audit entries preserve the before/after context needed by future engines

## API Surface

Internal workflow engine endpoints are available under:

- /api/enterprise/workflow-engine/workflow-types
- /api/enterprise/workflow-engine/workflow-types/[workflowTypeId]/states
- /api/enterprise/workflow-engine/workflow-types/[workflowTypeId]/transitions
- /api/enterprise/workflow-engine/workflow-types/[workflowTypeId]/workflows
- /api/enterprise/workflow-engine/workflows
- /api/enterprise/workflow-engine/workflows/[workflowId]/stages
- /api/enterprise/workflow-engine/workflows/[workflowId]/stages/[stageId]/actions
- /api/enterprise/workflow-engine/workflow-instances
- /api/enterprise/workflow-engine/workflow-instances/evaluate
- /api/enterprise/workflow-engine/workflow-instances/[workflowInstanceId]/participants
- /api/enterprise/workflow-engine/workflow-instances/[workflowInstanceId]/decisions
- /api/enterprise/workflow-engine/workflow-rules
- /api/enterprise/workflow-engine/workflow-escalations
- /api/enterprise/workflow-engine/workflow-events
- /api/enterprise/workflow-engine/workflow-history
- /api/enterprise/workflow-engine/workflow-attachments
- /api/enterprise/workflow-engine/workflow-comments
- /api/enterprise/workflow-engine/workflow-audit

Access model:

- Uses existing internal enterprise authentication gate.
- Does not change authentication behavior.
- Exposes internal metadata only.

## Phase 3 Foundation: Enterprise Event Bus & Domain Event Engine

Phase 3 introduces a generic, reusable enterprise event bus and domain event foundation.

The design is independent from recruitment, finance, dashboards, notifications, AI execution, and workflow business execution.

Phase 3 adds event metadata, routing contracts, retry/replay mechanics, dead-letter tracking, and immutable event logging.

## Event Bus Model

The event foundation models the following reusable concepts:

- Event Category
- Event Type
- Event Channel
- Event Publisher
- Event Subscriber
- Event Queue
- Event Handler
- Event Subscription
- Event
- Event Delivery
- Event Retry
- Event Log

## Event Lifecycle

Event status transitions are evaluated through a dedicated lifecycle helper, not hardcoded in business modules.

Supported generic states:

- created
- queued
- processing
- delivered
- failed
- cancelled
- retried
- archived

Design characteristics:

- lifecycle transitions are validated before status updates
- event records are immutable audit entities
- replay creates new events linked to original metadata

## Publishing and Subscription

Publishing and subscription are modeled as generic contracts:

- publishing requires event type, category, channel, publisher, queue, and idempotency metadata
- subscriptions can target category/type plus routing context
- optional scope filters support organization, branch, country, and workflow reference

Idempotency behavior:

- event publish requests are deduplicated by idempotency key
- duplicates return accepted metadata referencing the original event

## Routing and Delivery

Routing uses subscription matching helpers against event context.

Routing inputs include:

- event type and category
- priority filter
- organization context
- branch and country dimensions
- workflow reference

Delivery records are stored separately so transport status and event status are independently auditable.

## Retry, Replay, and Dead Letter Queue

Retry behavior is generic and metadata-driven:

- retry count and max retry count are tracked per event
- retry scheduling uses next retry timestamps
- retry attempts are logged in dedicated retry records

Replay behavior is generic:

- replay clones event payload/metadata into a new queued event
- replay metadata preserves source event linkage

Dead-letter behavior:

- events exceeding retry constraints are marked failed and dead-lettered
- dead-letter timestamp is persisted for forensic and operational review

## Immutable Event Log

Event logs are append-only records attached to events and optional deliveries.

Typical log categories include:

- publish
- routing
- retry
- replay
- dead_letter

This preserves chronological evidence without mutating historical log entries.

## Event Engine API Surface

Internal event engine endpoints are available under:

- /api/enterprise/event-engine/event-categories
- /api/enterprise/event-engine/event-types
- /api/enterprise/event-engine/event-channels
- /api/enterprise/event-engine/event-publishers
- /api/enterprise/event-engine/event-subscribers
- /api/enterprise/event-engine/event-queues
- /api/enterprise/event-engine/event-handlers
- /api/enterprise/event-engine/event-subscriptions
- /api/enterprise/event-engine/event-subscriptions/[subscriptionId]/unsubscribe
- /api/enterprise/event-engine/events
- /api/enterprise/event-engine/events/[eventId]/retry
- /api/enterprise/event-engine/events/[eventId]/replay
- /api/enterprise/event-engine/event-deliveries
- /api/enterprise/event-engine/event-retries
- /api/enterprise/event-engine/event-dead-letter
- /api/enterprise/event-engine/event-logs

Access model:

- Uses existing internal enterprise authentication gate.
- Does not change authentication behavior.
- Exposes internal metadata and operational contracts only.

## Phase 4 Foundation: Enterprise Notification & Communication Engine

Phase 4 introduces a generic enterprise notification and communication foundation that consumes events from the enterprise event engine.

The design is decoupled from recruitment, finance, employee-specific modules, and AI execution.

Supported channel abstractions:

- in_app
- email
- sms
- push
- webhook
- future

This phase models channel metadata and delivery lifecycle only. It does not integrate external providers.

## Notification Model

The notification foundation models the following reusable concepts:

- Notification
- Notification Template
- Notification Rule
- Notification Channel
- Notification Preference
- Notification Delivery
- Notification Queue
- Notification Retry
- Notification History
- Notification Audit

## Template Rendering and Localization

Templates are data-driven entities with per-channel and per-locale variants.

Capabilities:

- tokenized title/body rendering from event and metadata context
- locale selection through rule defaults and user preferences
- fallback locale resolution when preference locale is absent

## Delivery Lifecycle and Communication Controls

Notification lifecycle supports generic states:

- created
- queued
- processing
- sent
- delivered
- failed
- cancelled
- read
- unread
- archived
- deleted

Delivery features:

- scheduling via available/scheduled timestamps
- retry tracking with retry limits and timestamps
- bulk notification creation to multiple recipients
- read/unread transitions
- soft delete with reason
- archive/unarchive behavior

## Preference and Policy Foundation

Per-recipient preferences are modeled independently from business modules.

Capabilities:

- per-channel enable/disable
- rule-specific preference overrides
- mute windows
- quiet-hours metadata

Preference checks are applied during event-consumption routing to skip muted deliveries.

## Event Engine Integration Boundary

The notification engine consumes event records from `pgems_events` and applies notification rules filtered by:

- event type
- event category
- active rule status

Integration constraints:

- consumes events only from Enterprise Event Engine
- does not call recruitment, finance, employee, or AI modules
- keeps routing and rendering logic generic and metadata-driven

## Notification Engine API Surface

Internal notification engine endpoints are available under:

- /api/enterprise/notification-engine/notification-channels
- /api/enterprise/notification-engine/notification-templates
- /api/enterprise/notification-engine/notification-rules
- /api/enterprise/notification-engine/notification-preferences
- /api/enterprise/notification-engine/notification-queues
- /api/enterprise/notification-engine/notifications
- /api/enterprise/notification-engine/notifications/bulk
- /api/enterprise/notification-engine/notifications/[notificationId]/read
- /api/enterprise/notification-engine/notifications/[notificationId]/archive
- /api/enterprise/notification-engine/notifications/[notificationId]/soft-delete
- /api/enterprise/notification-engine/notification-deliveries
- /api/enterprise/notification-engine/notification-retries
- /api/enterprise/notification-engine/notification-history
- /api/enterprise/notification-engine/notification-audit
- /api/enterprise/notification-engine/consume-event

Access model:

- Uses existing internal enterprise authentication gate.
- Does not change authentication behavior.
- Exposes internal metadata and engine contracts only.

## Phase 5 Foundation: AI Orchestration Platform

Phase 5 introduces a generic AI orchestration platform that serves as the shared AI foundation for future modules.

This phase is not a chatbot implementation and not a business feature implementation. It provides provider abstraction, prompt lifecycle, routing, fallback, telemetry, usage, safety, and audit foundations.

The AI platform integrates with:

- Organization Core (access boundaries)
- Authority Foundation (policy thresholds)
- Workflow Engine (future orchestration composition)
- Event Engine (publish/consume integration)
- Notification Engine (future downstream integration contracts)

without coupling to business modules.

## Provider Abstraction

The platform models provider adapters for:

- OpenAI
- Anthropic Claude
- Google Gemini
- Azure OpenAI
- DeepSeek
- Local LLM
- future providers

Design characteristics:

- adapter interfaces are provider-agnostic
- no API key hardcoding
- no real external API calls in the foundation layer
- simulated adapter execution supports deterministic integration testing

## AI Platform Model

The AI foundation models the following reusable concepts:

- AI Provider
- AI Model
- AI Task
- AI Request
- AI Response
- AI Prompt
- AI Prompt Version
- AI Policy
- AI Routing Rule
- AI Fallback Rule
- AI Cost Tracking
- AI Usage
- AI Cache
- AI Telemetry
- AI Audit
- AI Safety Check
- AI Rate Limit

## Routing and Fallback Strategy

Routing is metadata-driven and supports selection by:

- task type
- priority
- provider health
- region
- compliance tags
- latency/cost constraints

Fallback strategy is modeled separately through explicit fallback rules by task type and trigger reasons.

This allows future runtime engines to apply progressive provider/model fallback without business-module coupling.

## Prompt Lifecycle and Localization

Prompt management supports:

- prompt templates
- prompt versioning
- variable interpolation
- localization
- system/developer/user prompt layers

Prompt rendering is performed through versioned templates and structured variables, preserving deterministic prompt lifecycle behavior.

## Telemetry, Usage, Cost, and Audit

The AI platform provides append-friendly operational tracking:

- usage records (token and latency dimensions)
- cost tracking aggregates
- telemetry metrics with dimensions
- safety check outcomes
- audit trail for platform actions
- cache metadata for response reuse strategies

These capabilities are generic and reusable for future modules.

## Event Engine Integration Boundary

The AI platform integrates with Enterprise Event Engine through generic publish/consume contracts.

Capabilities:

- publish AI platform events to enterprise event store
- consume enterprise events for AI task orchestration triggers
- preserve correlation and trace identifiers for observability

Integration constraints:

- no direct communication with recruitment or business modules
- no direct execution of business AI capabilities

## AI Platform API Surface

Internal AI platform endpoints are available under:

- /api/enterprise/ai-platform/ai-providers
- /api/enterprise/ai-platform/ai-models
- /api/enterprise/ai-platform/ai-prompts
- /api/enterprise/ai-platform/ai-prompts/render
- /api/enterprise/ai-platform/ai-prompt-versions
- /api/enterprise/ai-platform/ai-policies
- /api/enterprise/ai-platform/ai-routing-rules
- /api/enterprise/ai-platform/ai-routing-rules/select
- /api/enterprise/ai-platform/ai-fallback-rules
- /api/enterprise/ai-platform/ai-tasks
- /api/enterprise/ai-platform/ai-tasks/execute
- /api/enterprise/ai-platform/ai-requests
- /api/enterprise/ai-platform/ai-responses
- /api/enterprise/ai-platform/ai-usage
- /api/enterprise/ai-platform/ai-cache
- /api/enterprise/ai-platform/ai-telemetry
- /api/enterprise/ai-platform/ai-audit
- /api/enterprise/ai-platform/ai-safety-checks
- /api/enterprise/ai-platform/ai-rate-limits
- /api/enterprise/ai-platform/ai-events/publish
- /api/enterprise/ai-platform/ai-events/consume

Access model:

- Uses existing internal enterprise authentication gate.
- Does not change authentication behavior.
- Exposes internal metadata and orchestration contracts only.

## Phase 6-7 Completion: AI Recruitment Intelligence

Phase 6 introduced the first business-facing AI module on top of the AI platform foundation.

Phase 7 completes Candidate Intelligence by canonicalizing extracted data into one professional candidate profile used as the module source of truth.

This module transforms candidate documents into structured professional profile intelligence while preserving strict advisory boundaries.

Design principles:

- consumes generic AI platform capabilities only
- does not modify prior AI foundation modules
- does not perform automatic hiring or final decisions
- keeps all AI recommendations reviewable by Prime Global staff

## Candidate Profile Model

The recruitment intelligence foundation models:

- Candidate Document Analysis
- Candidate Professional Profile
- Candidate Skill Extraction
- Candidate Skill Normalization
- Candidate Experience Extraction
- Candidate Education Extraction
- Candidate Certification Extraction
- Candidate Language Extraction
- Candidate Timeline Entries
- Candidate Confidence Scores
- Candidate Review Status
- Candidate AI Recommendation
- Candidate Canonical Professional Profile
- Candidate Canonical Field Evidence
- Candidate Conflict Objects
- Candidate Review Queue Items
- Candidate Canonical Timeline
- Candidate Knowledge Graph Nodes/Edges

Original document safety:

- source files are treated as immutable
- profile generation never overwrites original uploaded documents
- extraction records reference document provenance metadata

## Skill Normalization Engine

Skill normalization is global taxonomy-driven.

Capabilities:

- canonical skill taxonomy entries
- alias registry per locale
- multilingual key normalization for alias matching
- fallback behavior when a raw skill has no canonical mapping

Example taxonomy behavior:

- JS
- Javascript
- Java Script

maps to canonical `JavaScript` when alias/taxonomy matches exist.

## Confidence and Evidence Model

Every extracted field stores:

- confidence score
- extraction source
- document reference
- AI model used
- extraction timestamp

Canonical fields also preserve evidence arrays that include:

- original document
- source page (when available)
- extraction method
- AI model
- confidence score
- extraction timestamp

Confidence is also aggregated into profile-level dimensions:

- skills
- experience
- education
- certifications
- language
- overall score

## Human Review Workflow

AI output remains advisory-only and never grants final approval.

Review lifecycle statuses:

- pending_review
- approved_by_staff
- rejected_by_staff
- needs_manual_review

Recommendations are explicitly advisory and include rationale metadata for staff decisioning.

Conflict handling and review obligations:

- conflicting values are persisted as conflict objects with `needs_staff_review`
- low-confidence canonical fields are persisted as review items
- missing information is persisted as review items
- no conflict is auto-resolved by AI

## Event Integration

The module publishes events through enterprise event infrastructure:

- CandidateProfileCreated
- CandidateProfileUpdated
- CandidateExtractionCompleted
- CandidateReviewRequested
- CandidateProfileCanonicalized
- CandidateConflictDetected
- CandidateReviewUpdated

It also supports event consumption hooks for future orchestration triggers.

## Phase 8 Completion: Smart Job Matching Platform

Phase 8 completes advisory Smart Job Matching on top of Candidate Intelligence canonical profiles.

Matching engine principles:

- recommendations are advisory only
- Prime Global staff keeps final decisions
- no automatic hiring, rejection, or interview scheduling
- matching evidence remains traceable to candidate canonical fields and source documents

Matching dimensions and weighting:

- skills (required and preferred): 28%
- experience (years, industry, specialization, career level, job function): 20%
- education: 10%
- certifications: 8%
- languages: 8%
- location (country and region): 12%
- availability (work authorization, employment type, availability): 14%

Match scorecard fields:

- overall_match_score
- skills_score
- experience_score
- education_score
- certification_score
- language_score
- location_score
- availability_score
- confidence_score
- explanation text for each score field

Match categories:

- excellent_match
- strong_match
- good_match
- possible_match
- weak_match
- no_match

Human review states:

- pending_review
- approved_by_staff
- rejected_by_staff
- needs_manual_review

Matching events:

- CandidateMatched
- JobMatched
- MatchingCompleted
- MatchingReviewed

## Phase 9 Completion: Candidate Portal Integration

Phase 9 completes the candidate-facing vertical slice by wiring existing AI capabilities into one end-to-end portal journey without introducing any new engine.

Integrated journey:

1. Candidate account and profile onboarding using existing candidate/auth modules.
2. Candidate document uploads through existing resume and private-document APIs.
3. Candidate Intelligence document analysis reuses existing AI recruitment intelligence repositories.
4. Canonical Candidate Profile generation is triggered from portal workflow orchestration.
5. Candidate Intelligence canonical fields, confidence, review items, and timeline are exposed in candidate profile APIs.
6. Staff review lifecycle starts automatically via existing review status and review item persistence.
7. Candidate portal surfaces current review status and missing information directly from canonical intelligence outputs.
8. Smart Job Matching runs on canonical profile and published jobs using the existing advisory matching module.
9. Matching results are exposed on candidate endpoints with score breakdown and explanations.
10. Candidate job application flow reuses existing apply and application status infrastructure.
11. Application tracking uses workflow history from status events to show current stage and progression.

Architecture reuse boundary:

- Organization Core, Authority Foundation, Workflow Engine, Event Engine, Notification Engine, AI Platform, Candidate Intelligence, and Smart Job Matching were reused as-is.
- No new subsystem or parallel workflow engine was introduced.
- Event publication continues through existing enterprise event routing contracts.
- Notifications continue through existing notification event records and delivery channels.

Candidate portal pages and data contracts:

- Profile page: canonical professional summary, skills, experience, education, languages, certifications, timeline, completion, review status, confidence, missing information.
- Documents page: uploaded documents, verification status, AI processing history, review history, extraction-related activity.
- Matching page: advisory matches, overall score, dimension breakdown, strengths, weaknesses, missing skills, recommended improvements, confidence, and matching timestamp.
- Applications page: apply, withdraw, status timeline, workflow progress, current stage.

Notification scenarios covered through existing Notification Engine tables/services:

- Profile Ready
- Review Requested
- Review Completed
- New Matching Jobs
- Application Updated

## AI Recruitment Intelligence API Surface

Internal endpoints are available under:

- /api/enterprise/ai-recruitment-intelligence/document-analyses
- /api/enterprise/ai-recruitment-intelligence/professional-profiles
- /api/enterprise/ai-recruitment-intelligence/professional-profiles/generate
- /api/enterprise/ai-recruitment-intelligence/skill-taxonomy
- /api/enterprise/ai-recruitment-intelligence/skill-aliases
- /api/enterprise/ai-recruitment-intelligence/skill-extractions
- /api/enterprise/ai-recruitment-intelligence/experience-extractions
- /api/enterprise/ai-recruitment-intelligence/education-extractions
- /api/enterprise/ai-recruitment-intelligence/certification-extractions
- /api/enterprise/ai-recruitment-intelligence/language-extractions
- /api/enterprise/ai-recruitment-intelligence/timeline-entries
- /api/enterprise/ai-recruitment-intelligence/confidence-scores
- /api/enterprise/ai-recruitment-intelligence/review-status
- /api/enterprise/ai-recruitment-intelligence/review-status/[reviewId]/update
- /api/enterprise/ai-recruitment-intelligence/recommendations
- /api/enterprise/ai-recruitment-intelligence/canonical-profiles
- /api/enterprise/ai-recruitment-intelligence/canonical-fields
- /api/enterprise/ai-recruitment-intelligence/conflicts
- /api/enterprise/ai-recruitment-intelligence/conflicts/[conflictId]/update
- /api/enterprise/ai-recruitment-intelligence/review-items
- /api/enterprise/ai-recruitment-intelligence/canonical-timeline
- /api/enterprise/ai-recruitment-intelligence/knowledge-graph/nodes
- /api/enterprise/ai-recruitment-intelligence/knowledge-graph/edges
- /api/enterprise/ai-recruitment-intelligence/smart-matching
- /api/enterprise/ai-recruitment-intelligence/smart-matching/reviews
- /api/enterprise/ai-recruitment-intelligence/smart-matching/[matchId]/review
- /api/enterprise/ai-recruitment-intelligence/events/consume

Access model:

- Uses existing internal enterprise authentication gate.
- Does not change authentication behavior.
- Exposes internal advisory intelligence contracts only.

## Phase Boundaries

Future modules may consume Phase 2 through Phase 6 foundations for business workflows and processing, while foundational boundaries remain explicit.

Not included in Phases 2 through 6:

- finance execution
- recruitment execution
- employee-specific workflow logic
- company-specific workflow logic
- dashboarding
- external transport execution (email/sms/push/webhook dispatch)
- business AI implementations (cv analysis, job matching, candidate scoring, interview AI, fraud detection, salary recommendation, salary prediction)
- automatic hiring or automatic rejection decisions
- automatic interview approval
- final candidate decisions without staff review

## Future AI Governance Integration Points

Planned integration points (not implemented in Phase 1):

- permission engine can constrain model access to sensitive enterprise records.
- hierarchy graph can provide context windows for explainable org insights.
- role/permission snapshots can be attached to governance audit trails.

## Migration Strategy

Phases 1, 1.5, 2, 3, 4, 5, 6, 7, and 8 use additive migrations only:

- 202607180001_pgems_organization_core.sql
- 202607180002_phase15_pgems_authority_foundation.sql
- 202607180003_pgems_workflow_engine_foundation.sql
- 202607180004_pgems_event_engine_foundation.sql
- 202607180005_pgems_notification_engine_foundation.sql
- 202607180006_pgems_ai_orchestration_platform_foundation.sql
- 202607180007_pgems_ai_recruitment_intelligence_foundation.sql
- 202607190001_phase7_candidate_intelligence_canonicalization.sql
- 202607190002_phase8_smart_job_matching_platform.sql

No previous migration files are edited.
