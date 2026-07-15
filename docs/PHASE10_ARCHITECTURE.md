# Phase 10 Foundation Architecture

Stage 1 establishes the reusable Prime Global Shield Plus foundation only.

## Principles
- Additive only.
- Disabled by default for risky capabilities.
- Zero-trust request handling.
- Explicit policy evaluation and explainable rule gating.
- Internal domain events with no external broker dependency yet.
- Provider abstraction before service integration.
- Tenant-aware context without full multi-tenancy.

## Foundation Modules
- `src/lib/server/phase10/feature-flags`
- `src/lib/server/phase10/policy-engine`
- `src/lib/server/phase10/rule-engine`
- `src/lib/server/phase10/events`
- `src/lib/server/phase10/providers`
- `src/lib/server/phase10/observability`
- `src/lib/server/phase10/organization`
- `src/lib/server/phase10/security`

## API Foundation
- `GET /api/v1/health`
- `GET /api/v1`
- `GET /api/v1/phase10`

## Non-Goals for Stage 1
- No video room integration.
- No payment integration.
- No OCR or file scanning implementation.
- No AI recruiter or AI coach behavior.
- No evidence vault persistence.
- No progressive enforcement execution.
- No production database migrations.
- No existing route changes.

## Notes
- New policies and business rules exist as foundation objects only.
- Existing production routes keep their current behavior until later stages explicitly wire Phase 10 services in.

## Stage 3 Reusable Infrastructure (Foundation Only)
- `HashProvider` abstraction for deterministic digesting.
- `EvidenceStorageProvider` abstraction for evidence-monitor snapshots.
- `ClockProvider` abstraction for deterministic monitor and replay timestamps.
- `IdProvider` abstraction for monitor run IDs and replay cursors.
- `CryptoProvider` abstraction for digest signature and verification workflows.
- `EvidenceIntegrityMonitor` foundation for hash-chain monitoring.
- `TamperDetection` model for severity-based chain integrity signals.
- `EventReplay` foundation for deterministic case rehydration.
- Evidence envelope versioning for schema-aware replay.
- Forward and backward compatibility helpers for migration-safe payload handling.

## Stage 3 Guardrails
- No OCR implementation.
- No QR scanning implementation.
- No AI implementation.
- No progressive enforcement implementation.
- No risk scoring implementation.
- No video integration implementation.
- No payment integration implementation.
- No attachment scanning implementation.
- No external provider connection.
- Every Stage 3 entrypoint remains disabled unless explicitly feature-flagged.

## Stage 4 Workflow Kernel (Foundation Only)
- Adds a reusable orchestration kernel under `src/lib/server/phase10/workflow`.
- Introduces command and query abstractions with explicit actor/organization/tenant context.
- Adds generic workflow state machines with explainable transitions and optimistic version checks.
- Adds execution pipeline ordering for policy, business rules, idempotency, locking, persistence, timeline, notification, and observability.
- Adds in-memory-only idempotency, locking, and atomic persistence implementations for testing.
- Adds compensation infrastructure for safe multi-step rollback attempts with human-handover signaling.
- Adds deterministic workflow event ordering and replay-safe pure state reconstruction support.
- Adds privacy-safe structured error shaping for kernel failures.

### Stage 4 Feature Flags (Default Disabled)
- `WORKFLOW_KERNEL_ENABLED`
- `WORKFLOW_COMMANDS_ENABLED`
- `WORKFLOW_QUERIES_ENABLED`
- `WORKFLOW_IDEMPOTENCY_ENABLED`
- `WORKFLOW_LOCKING_ENABLED`
- `WORKFLOW_OPTIMISTIC_LOCKING_ENABLED`
- `WORKFLOW_COMPENSATION_ENABLED`
- `WORKFLOW_EVENT_REPLAY_ENABLED`

### Stage 4 Non-Goals
- No production workflow route wiring.
- No OCR, QR scanning, attachment scanning, progressive enforcement, or risk scoring behavior.
- No live video provider integration.
- No payment provider integration.
- No AI recruiter/candidate assistant behavior.
- No Governance Center UI.
- No production migration execution.

## Stage 5 Recruitment Orchestrator (Foundation Only)
- Adds a durable orchestration layer under `src/lib/server/phase10/orchestrator` above the Stage 4 Workflow Kernel.
- Introduces orchestration identity/state model, workflow graph validation, and saga execution foundations.
- Adds long-running execution abstractions: scheduling timestamps, lease state, recovery cursor, retry count, and suspension/resume controls.
- Adds durable snapshot repository abstraction with integrity hashing, CAS support, and history/migration hooks.
- Adds recovery service foundation for incomplete orchestration discovery and integrity-aware restore decisions.
- Adds timeout and retry policy foundations with non-retryable safety categories.
- Adds scheduler provider abstraction with in-memory claim/lease/complete/fail/retry lifecycle.
- Adds manual intervention foundation with staff-only controls and justification/evidence requirements.
- Adds read-only inspector and visualization projection models with role-shaped privacy boundaries.
- Adds orchestration event ingestion guardrails for deterministic ordering, duplicate detection, and out-of-order detection.
- Adds atomic orchestration unit-of-work abstraction with rollback semantics for testing.

### Stage 5 Feature Flags (Default Disabled)
- `RECRUITMENT_ORCHESTRATOR_ENABLED`
- `ORCHESTRATION_SAGAS_ENABLED`
- `ORCHESTRATION_GRAPHS_ENABLED`
- `ORCHESTRATION_SNAPSHOTS_ENABLED`
- `ORCHESTRATION_RECOVERY_ENABLED`
- `ORCHESTRATION_TIMEOUTS_ENABLED`
- `ORCHESTRATION_RETRIES_ENABLED`
- `ORCHESTRATION_SCHEDULER_ENABLED`
- `ORCHESTRATION_MANUAL_INTERVENTION_ENABLED`
- `ORCHESTRATION_INSPECTOR_ENABLED`
- `ORCHESTRATION_VISUALIZATION_ENABLED`

### Stage 5 Non-Goals
- No production route integration.
- No OCR or QR scanning.
- No attachment scanning.
- No progressive enforcement or risk scoring activation.
- No real protected interview workflow activation.
- No video/payment provider integration.
- No AI recruiter/candidate assistant behavior.
- No Governance Center UI.
- No production migration changes.
- No external queues or external schedulers.

## Phase 10 Import Convention
- Phase 10 foundation modules use explicit `.ts` import specifiers inside `src/lib/server/phase10/**`.
- This exists because the foundation is exercised directly by Node-based tests, and the explicit specifiers keep the TS source graph resolvable in that runtime.
- Use this convention only inside the Phase 10 foundation until reviewed for broader adoption.
- Do not expand this pattern into unrelated modules without a separate review, because the rest of the repository should continue to follow the existing import style unless a future change explicitly needs the same runtime constraint.
