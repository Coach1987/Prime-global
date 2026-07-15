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

## Phase 10 Import Convention
- Phase 10 foundation modules use explicit `.ts` import specifiers inside `src/lib/server/phase10/**`.
- This exists because the foundation is exercised directly by Node-based tests, and the explicit specifiers keep the TS source graph resolvable in that runtime.
- Use this convention only inside the Phase 10 foundation until reviewed for broader adoption.
- Do not expand this pattern into unrelated modules without a separate review, because the rest of the repository should continue to follow the existing import style unless a future change explicitly needs the same runtime constraint.
