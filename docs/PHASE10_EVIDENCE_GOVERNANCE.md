# Phase 10 Evidence Governance

Stage 2 introduces the first database-backed Prime Global Shield governance layer.

## Evidence lifecycle
1. Sensitive recruitment activity is captured as an immutable evidence event.
2. The event is hashed and chained to the previous event in the same evidence case.
3. Evidence access is logged separately from the event record.
4. Corrections are appended as new evidence events.
5. Export requests, legal hold transitions, and appeal references are recorded as additional events.

## Role and RLS model
- Candidates and employers do not access the evidence vault.
- Only Prime Global recruiter/admin roles may access permitted evidence.
- Trusted server-side operations create evidence events and audit access.
- Export and legal-hold actions are restricted to authorized staff roles.
- Every sensitive evidence access is recorded in a dedicated audit table.

## API surface (Stage 2)
- GET `/api/v1/recruitment/shield/evidence`: evidence lookup by case or event id.
- POST `/api/v1/recruitment/shield/evidence/access`: explicit access audit write.
- POST `/api/v1/recruitment/shield/evidence/export`: export request event append.
- POST `/api/v1/recruitment/shield/evidence/legal-hold`: legal hold activation/release append.
- POST `/api/v1/recruitment/shield/evidence/correction`: append-only correction event.
- POST `/api/v1/recruitment/shield/evidence/verify-chain`: hash-chain verification.

## Zero-trust request sequence
1. Rate limit guard applies per endpoint scope and caller IP.
2. Bearer auth validation resolves user and app role.
3. Staff-only policy check validates role and Prime Global organization boundary.
4. Route-level action executes with immutable event append semantics.
5. Access and operational audit records are persisted.

## Privacy and retention assumptions
- Store secure object references, hashes, redacted excerpts, and normalized summaries instead of raw private content where possible.
- Evidence remains append-only for normal application roles.
- Retention and legal-hold state are tracked as evidence metadata, not as mutable in-place edits.

## Table controls
- `shield_evidence_events` stores immutable evidence-chain entries.
- `shield_evidence_access_audit` stores read/access accountability records.
- Update/delete triggers on evidence events are blocked with append-only guard errors.
- RLS allows read access only for authorized Prime Global staff roles.
- RLS permits inserts for trusted service role operations only.

## Legal limitations
- The evidence vault is designed to support future legal review.
- It does not claim automatic legal enforceability in every jurisdiction.
- Jurisdiction-specific legal review remains a required pre-launch task.

## Correction and appeal behavior
- Corrections never overwrite the original evidence event.
- Each correction is appended and linked back to the source event.
- Appeals and staff decisions are recorded as references in the evidence history so reviewers can reconstruct the full chain of actions.