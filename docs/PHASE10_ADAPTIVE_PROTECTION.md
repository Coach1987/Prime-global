# Phase 10 Stage 8.5: Adaptive, Explainable, Reversible Protection

## Scope
Stage 8.5 extends the Stage 8 protection foundation with:
- adaptive protection context evaluation
- explainable protection decisions
- reversible field-level disclosure controls

No production route wiring, no external providers, and no production migrations are included.

## Adaptive Protection Context
The typed context includes:
- recruitment workflow stage
- actor role
- organization scope
- tenant scope
- policy version
- candidate consent version
- employer verification status
- interview status
- payment status
- contract state
- active freeze state
- active critical violation state
- authorized staff override
- field-level disclosure policy

Default protection remains strict privacy when policy or rule checks fail.

## Protection Levels
Supported policy-controlled levels:
- strict_private
- protected_recruitment
- staff_review
- authorized_partial_reveal
- contract_stage_limited_reveal
- closed_process

No level permits employer access to the original document.

## Field-Level Disclosure
Field categories include professional and private fields such as:
- professional_name
- general_location
- skills
- portfolio
- personal_email
- personal_phone
- precise_address
- passport_number
- national_id
- original_cv
- private_documents

Disclosure states:
- hidden
- masked
- summarized
- protected_placeholder
- revealed
- staff_only

Immutable restrictions are enforced for:
- original_cv
- private_documents
- passport_number
- national_id
- precise_address

## Explainable Decisions
Decision model contains:
- decision/policy/rule identity
- evaluated context and conditions
- previous and resulting disclosure state
- reason code
- internal/candidate/employer explanations
- next actions and blocking reasons
- origin and optional confidence
- review and override metadata
- feedback status (confirmed, false_positive, ignored, manually_reviewed, policy_exception)

Candidate explanation remains simple:
Prime Global protects your personal information and shares only the professional details required at each stage.

## Reversible Protection Plan
Protection plan includes:
- immutable original reference
- protected/public references
- disclosure manifest
- allowed and denied transition rules
- transition prerequisites
- policy/workflow/consent requirements
- payment and contract requirements
- freeze and critical violation restrictions
- transition history and rollback target
- irreversible field list
- optional expiry/revocation timestamps

## Command and Query Foundations
Typed foundations:
- EvaluateProtectionLevelCommand
- RequestFieldRevealCommand
- ApproveFieldRevealCommand
- RevokeFieldRevealCommand
- GetDisclosureManifestQuery
- GetProtectionDecisionExplanationQuery

Integration hooks are provided for Workflow Kernel, Policy Engine, Rule Engine, Recruitment Orchestrator, Evidence, Audit, Timeline, and Domain Events.

## Events
Added non-accusatory events:
- ProtectionLevelEvaluated
- DisclosureManifestCreated
- FieldRevealRequested
- FieldRevealApproved
- FieldRevealDenied
- FieldRevealRevoked
- DisclosureStateChanged
- ProtectionPolicyReevaluated

## Employer-Safe Projection
Employer projection returns only policy-authorized field categories and disclosure states. It never includes:
- original object reference/path
- private document path
- evidence metadata
- staff notes
- immutable private identifiers

## Zero Trust and Governance
- organization scope checks are enforced in reveal command handling
- unauthorized staff actions are denied
- all reveal approvals/denials/revocations are auditable
- evidence stores metadata hashes and decision metadata without unnecessary raw private values

## Known Limitations
- no production route integration yet
- no binary redaction renderer
- no external providers
- no AI training or adaptive model learning

## Contributor Rules
- keep candidate messaging simple and non-technical
- never expose original CV/private documents to employers
- keep Stage 8.5 flags disabled by default
- do not bypass immutable restrictions with staff overrides
