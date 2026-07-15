# Phase 10 Stage 5: Recruitment Orchestrator Foundation

Stage 5 introduces a durable recruitment orchestrator layer above the Stage 4 Workflow Kernel.

Scope: foundation only.
No production flow wiring, no provider integration, and no production migration changes.

## Kernel vs Orchestrator

Workflow Kernel responsibilities (Stage 4):
- execute one workflow command/query safely
- enforce per-workflow idempotency, locking, optimistic concurrency
- evaluate policy/rule gates for a single workflow transition

Orchestrator responsibilities (Stage 5):
- coordinate multiple workflow kernels as one protected lifecycle
- evaluate graph transitions and saga sequencing
- manage long-running orchestration state and scheduled wake-ups
- recover durable state after restart/crash
- provide manual intervention, inspection, and visualization-ready projections

## Orchestration Model

`src/lib/server/phase10/orchestrator/types` defines typed orchestration state with:
- orchestration identity and schema metadata
- status and current node
- graph definition version
- org/tenant and entity scope
- correlation, causation, idempotency
- expected/orchestration version numbers
- scheduling and timeout timestamps
- human review requirement
- last error category and recovery state

Foundation orchestration types:
- ProtectedRecruitmentOrchestration
- InterviewOrchestration
- HiringOrchestration
- PaymentAndContractOrchestration
- AppealOrchestration
- ViolationReviewOrchestration

## Saga Pattern

`src/lib/server/phase10/orchestrator/saga` supports step contracts with:
- prerequisites, success criteria, timeout, retry policy
- compensation actions
- irreversible/manual-review handling
- evidence/audit requirements
- skip and failure paths

Compensation executes in reverse order where safe.
Irreversible failures move to manual review and stop auto rollback.
Compensation never removes evidence/audit/timeline/legal-hold records.

## Graph Model

`src/lib/server/phase10/orchestrator/graphs` provides typed directed graphs with:
- nodes, edges, conditional/failure/timeout/compensation edges
- policy/rule gate metadata
- feature-flag nodes, waiting/scheduled/manual-review nodes
- terminal nodes and cycle policy

Validation includes:
- missing/duplicate nodes
- invalid edges
- unreachable nodes
- cycle rejection unless explicitly enabled
- missing terminal state
- invalid compensation targets
- unsafe irreversible transitions

## Long-Running Execution

`src/lib/server/phase10/orchestrator/execution/long-running` defines durable state fields:
- next action timestamp
- timeout timestamp
- lease owner/expiry and heartbeat
- recovery cursor
- retry count
- last successful node
- pending external confirmation
- manual review hold
- suspend/resume

In-memory persistence is provided for test determinism.

## Durable Snapshots

`src/lib/server/phase10/orchestrator/snapshots` provides:
- save/load/history
- compare-and-swap
- integrity hashing and verification
- graph-version migration hook
- append-style history

Snapshot includes orchestration state, completed/pending/failed/compensated nodes, versioning, cursors, retry/timeout/schedule/human-intervention state.

## Recovery

`src/lib/server/phase10/orchestrator/recovery` provides recovery foundation for:
- incomplete orchestration detection
- latest snapshot restore
- integrity verification
- compromised/manual review signaling when verification fails
- recovery history entries with audit/evidence references

Auto-resume is blocked when integrity verification fails.

## Timeouts

`src/lib/server/phase10/orchestrator/timeouts` supports:
- absolute and relative deadlines
- grace period
- timeout and escalation actions
- notification schedule projection
- manual override metadata
- evidence/audit requirements

Foundation timeout policies include:
- interview invitation timeout
- payment confirmation timeout

## Retry Engine

`src/lib/server/phase10/orchestrator/retries` supports:
- fixed and exponential backoff
- jitter
- retryable/non-retryable categories
- max attempts and max elapsed duration
- dead-letter transition metadata
- manual review after exhaustion

Never-retry categories include unauthorized, policy denial, business rule failure, invalid transition, integrity compromise, legal-hold conflict, and permanent validation errors.

## Scheduler

`src/lib/server/phase10/orchestrator/scheduler` provides in-memory scheduling with:
- schedule, reschedule, cancel
- list due actions
- claim with lease
- complete/fail/retry
- org/tenant scope and idempotency key
- orchestration/node/correlation fields
- payload hash and privacy-safe metadata

## Manual Intervention

`src/lib/server/phase10/orchestrator/intervention` supports authorized staff actions:
- pause/resume
- retry failed node
- skip reversible node with justification
- move to manual review
- approve/reject guarded transitions
- activate compensation
- acknowledge irreversible failure

Every record captures staff identity/role/scope, reason code, written justification, evidence refs, previous/next state, appeal eligibility, notification state, policy result, follow-up action, and next review timestamp.
Candidate/employer roles are denied.

## Inspector Model

`src/lib/server/phase10/orchestrator/inspector` provides read-only inspection with role shaping:
- candidate/employer views redact internal policy/rule/staff data
- recruiter/admin/super-admin views can access full internal projection

## Visualization Projection

`src/lib/server/phase10/orchestrator/visualization` returns privacy-safe data only:
- node statuses and timing
- durations
- blocking reasons and required next actions
- current/completed/failed/waiting/retrying/compensated/manual-review sets
- terminal state indicator

No chart/UI rendering is implemented in Stage 5.

## Event Integration

`src/lib/server/phase10/orchestrator/execution/events` provides:
- deterministic ordering by orchestration + workflow sequence
- duplicate event detection
- out-of-order event detection
- replay-safe pure projection helper

This is compatible with Stage 1 domain event metadata and Stage 3 replay patterns, and intended to coordinate with Stage 4 kernel command outcomes.

## Atomic Unit of Work

`src/lib/server/phase10/orchestrator/persistence` provides in-memory transactional unit-of-work for one orchestration step, containing:
- orchestration state
- workflow/saga updates
- snapshot append
- domain events
- audit/evidence/timeline references
- scheduled action
- idempotency completion
- retry/compensation state

Rollback behavior is included for failure tests.

## Idempotency and Concurrency

Stage 5 reuses Stage 4 idempotency/locking foundations and extends orchestration scope through:
- orchestration-level idempotency keys
- node/saga/scheduled-action/recovery/intervention scoped keys
- orchestration leases and stale lease recovery
- compare-and-swap conflict checks

No silent overwrite behavior is allowed.

## Zero Trust and Privacy

- orchestrator actions require explicit authorization checks
- cross-organization actions are denied
- intervention actions restricted to staff roles
- structured errors redact sensitive keys
- payload hashing is preferred for scheduler/idempotency metadata

## Future Postgres/Supabase Design Notes

Planned durable implementation (not in Stage 5):
- orchestration state and snapshot tables with append history
- CAS semantics in SQL for orchestration versioning
- scheduled action table + worker lease model
- transactional orchestration unit-of-work via SQL transaction or RPC wrapper
- optional provider adapters (Supabase scheduled functions, Vercel cron, queue adapter, Temporal-style adapter)

No external scheduler/provider is connected in Stage 5.

## Feature Flags (All Disabled by Default)

- RECRUITMENT_ORCHESTRATOR_ENABLED
- ORCHESTRATION_SAGAS_ENABLED
- ORCHESTRATION_GRAPHS_ENABLED
- ORCHESTRATION_SNAPSHOTS_ENABLED
- ORCHESTRATION_RECOVERY_ENABLED
- ORCHESTRATION_TIMEOUTS_ENABLED
- ORCHESTRATION_RETRIES_ENABLED
- ORCHESTRATION_SCHEDULER_ENABLED
- ORCHESTRATION_MANUAL_INTERVENTION_ENABLED
- ORCHESTRATION_INSPECTOR_ENABLED
- ORCHESTRATION_VISUALIZATION_ENABLED

## Known Limitations

- No production route integration.
- In-memory persistence/scheduler/lease implementations only.
- No external queue/cron/provider connection.
- No live workflow business activation.
- No OCR/QR/attachment scanning/progressive enforcement/risk scoring/video/payments/AI assistants/governance UI.

## Contributor Rules

- Keep orchestrator behavior behind Stage 5 flags.
- Preserve orchestrator-as-coordinator semantics for cross-workflow progression.
- Keep inspector read-only and role-shaped.
- Preserve replay determinism and duplicate/out-of-order protection.
- Do not add production migrations or external providers in this stage.
