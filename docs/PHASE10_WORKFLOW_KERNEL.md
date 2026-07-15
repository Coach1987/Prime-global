# Phase 10 Stage 4: Workflow Kernel Foundation

This document defines the Prime Global workflow orchestration kernel added in Stage 4.

Scope: foundation only.
No production recruitment route integration is performed in this stage.

## Goals

- Introduce command and query separation with explicit contracts.
- Provide reusable state-machine execution infrastructure.
- Add idempotency, locking, optimistic concurrency, and atomic persistence abstractions.
- Add compensation infrastructure for safe failure handling.
- Support deterministic event ordering and replay-safe state reconstruction.
- Enforce Zero Trust and privacy-safe error/log shaping.

## Module Layout

- src/lib/server/phase10/workflow/commands
- src/lib/server/phase10/workflow/queries
- src/lib/server/phase10/workflow/state-machine
- src/lib/server/phase10/workflow/execution
- src/lib/server/phase10/workflow/idempotency
- src/lib/server/phase10/workflow/locking
- src/lib/server/phase10/workflow/persistence
- src/lib/server/phase10/workflow/compensation
- src/lib/server/phase10/workflow/events
- src/lib/server/phase10/workflow/errors
- src/lib/server/phase10/workflow/types
- src/lib/server/phase10/workflow/testing

## Command / Query Separation

Commands:
- Carry envelope metadata required for traceability and safety:
  - name, version, command ID
  - idempotency key, correlation ID, causation ID
  - actor, organization, tenant context
  - workflow ID, optional expected version
  - submitted timestamp and validated payload
- Foundation command types were added for:
  - SelectCandidateCommand
  - RequestInterviewCommand
  - AcceptInterviewInvitationCommand
  - AcceptCoordinationTermsCommand
  - ActivateInterviewCommand
  - StartInterviewCommand
  - CompleteInterviewCommand
  - RecordHiringDecisionCommand
  - ConfirmServiceFeeCommand
  - VerifyPaymentCommand
  - UnlockContractCommand
  - SubmitAppealCommand
  - FreezeConversationCommand

Queries:
- Enforced as read-only handlers.
- Query execution enforces:
  - authentication
  - authorization
  - organization scope
  - tenant scope (where applicable)
  - privacy-safe response shaping

## Workflow State Machine Model

The kernel provides a generic state-machine engine with:
- workflow type and workflow ID
- current state and allowed transitions
- guard evaluation with explainable outcomes
- actor and timestamp capture
- expected/current version checks
- transition metadata and explanation
- blocking reasons and required next actions
- terminal states
- reversible and irreversible transitions
- optional staff override reason

Definitions are separated by workflow type:
- candidate selection
- interview
- offer
- hiring
- payment
- contract
- appeal
- violation

## Execution Pipeline Order

The command pipeline runs in this order:

1. validate command envelope
2. resolve actor context
3. resolve organization or tenant context
4. check feature flag
5. authorize role and ownership
6. evaluate policy engine
7. evaluate business rule engine
8. acquire idempotency protection
9. acquire workflow lock
10. load current workflow state
11. verify expected version
12. execute domain handler
13. persist atomically through unit-of-work abstraction
14. append domain events
15. write audit entry
16. append evidence reference where applicable
17. update timeline through adapter
18. enqueue notifications through adapter
19. emit structured observability data
20. release lock
21. return explainable result

## Idempotency Strategy

`IdempotencyStore` abstraction plus in-memory implementation supports:
- in-progress, completed, failed, expired statuses
- payload hashing (`sha256`) instead of raw payload retention
- scope: organization + tenant + optional actor
- configurable expiry (TTL)
- duplicate with same payload returns original result
- duplicate with different payload is rejected

## Locking Strategy

`WorkflowLockProvider` abstraction plus in-memory provider supports:
- scoped lock keys by workflow/aggregate ID
- lock owner and lease timeout
- lease renewal and release
- stale lock recovery on expiry
- structured conflict data for safe retries

## Optimistic Concurrency

Workflow state contains a version number.
`expectedVersion` can be supplied by commands.
Mismatch returns structured conflict with retry guidance.
No silent overwrite is performed.

## Atomic Persistence Boundary

`WorkflowRepository` and `WorkflowUnitOfWork` model one atomic logical write containing:
- workflow state update
- transition record
- domain events
- audit entry
- evidence reference
- timeline event
- idempotency completion marker

Current implementation is in-memory for deterministic tests.

Future Supabase/Postgres implementation guidance:
- map `runAtomic` to one SQL transaction
- ensure workflow version checks use compare-and-swap semantics in SQL
- store domain events with sequence indexes per workflow ID
- persist audit/evidence/timeline/idempotency within the same transaction or RPC function

## Compensation Model

Compensation infrastructure supports:
- registered compensation actions
- reverse-order execution
- per-step status tracking
- partial and failed outcomes
- irreversible step annotation
- manual review requirements
- audit/evidence records for compensation attempts

Important invariant:
- compensation does not delete or erase existing evidence/audit history.

## Event Ordering and Replay

Workflow event support includes:
- deterministic ordering by sequence
- schema and workflow version metadata
- correlation and causation IDs
- pure replay handlers for state reconstruction
- side-effect handlers separated from replay handlers
- dead-letter queue abstraction for failed side-effect handlers

The kernel integrates with existing Phase 10 domain event models and remains compatible with the Stage 3 replay approach (ordered replay, version-aware envelopes, and safe handler separation).

## Security and Privacy

Zero Trust requirements in kernel execution:
- client-submitted role/ownership/approval/payment/state/version are never trusted by default
- actor and scope are validated server-side in execution steps
- payload hashes are preferred over raw sensitive payload retention
- structured errors redact sensitive details
- log sanitization redacts CV/contact/token/credential fields

## Feature Flags (All Disabled by Default)

- WORKFLOW_KERNEL_ENABLED
- WORKFLOW_COMMANDS_ENABLED
- WORKFLOW_QUERIES_ENABLED
- WORKFLOW_IDEMPOTENCY_ENABLED
- WORKFLOW_LOCKING_ENABLED
- WORKFLOW_OPTIMISTIC_LOCKING_ENABLED
- WORKFLOW_COMPENSATION_ENABLED
- WORKFLOW_EVENT_REPLAY_ENABLED

## Known Limitations (Stage 4)

- No production route wiring yet.
- In-memory stores only (no external lock/idempotency/event broker).
- State-machine definitions are baseline foundations and require domain hardening before activation.
- No provider integrations for video/payment/OCR/scanning/AI.
- No production migration or production transaction wiring is included.

## Contributor Rules

- Keep new kernel behavior behind Stage 4 feature flags.
- Preserve command/query separation (queries must stay read-only).
- Never log raw sensitive payloads.
- Preserve deterministic event ordering and replay safety.
- Do not wire to production recruitment flow without explicit stage approval.
