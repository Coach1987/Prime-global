# Phase 10 Policy Engine

The Policy Engine is a metadata-first, explainable evaluation layer.

## Required policy fields
- policy name
- policy version
- scope
- subject role
- action
- condition
- severity
- enforcement action
- escalation rule
- enabled state
- effective date
- tenant or organization scope
- audit metadata

## Stage 1 registry
The registry contains the initial Phase 10 policies as disabled foundation definitions:
- candidate selection required before interview invitation
- candidate acceptance required before interview activation
- coordination terms required before joining
- no direct contact exchange
- no external meeting links
- original CV never exposed to employers
- payment verification required before contract unlock
- no active critical violation before contract unlock
- human approval required for permanent closure or contractual penalties

## Evaluation model
- Matching is based on action, role, and scope.
- Disabled policies do not enforce behavior yet.
- Results always include explanation and human-review requirement when a policy blocks an action.

## Stage 1 guarantee
- The engine is available for future wiring, but no current production route depends on it.

## Candidate Friendly Detection Policy Baseline
- Detection is observation-first and escalation-aware.
- Detection outcomes must include confidence and explanation.
- Low confidence: ignore.
- Medium confidence: observe and log only.
- High confidence: show a friendly reminder and allow edit-and-continue.
- Very high confidence with repeated confirmed attempts: evaluate policy and business rules, append evidence references, and allow governance review.
- Automatic punishment from a single detection is disallowed.

## Prohibited Automatic Actions
- Automatic bans.
- Automatic account suspension.
- Automatic candidate rejection.
- Automatic contract blocking.
- Automatic permanent penalties.
