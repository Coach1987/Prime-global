# Phase 10 Stage 8.75: Protection Rules Registry

## Purpose
Stage 8.75 adds a centralized, versioned Protection Rules Registry so protection logic stays reusable, explainable, and policy-linked.

## Rule Model
The typed rule model includes identity, versioning, lifecycle state, protected category/finding coverage, disclosure constraints, actions, reveal prerequisites, workflow/role constraints, scope, policy/business-rule links, governance metadata, and candidate-friendly explanation fields.

## Initial Conservative Rules
Initial rules include:
- PG-EMAIL-001
- PG-PHONE-001
- PG-URL-001
- PG-SHORT-URL-001
- PG-SOCIAL-001
- PG-QR-001
- PG-BARCODE-001
- PG-ADDRESS-001
- PG-PASSPORT-001
- PG-NATIONAL-ID-001
- PG-PERSONAL-NUMBER-001
- PG-CV-PRIVATE-001
- PG-PRIVATE-DOCUMENT-001
- PG-METADATA-001
- PG-EXTERNAL-MEETING-001
- PG-CONTRACT-REVEAL-001
- PG-PORTFOLIO-REVEAL-001
- PG-PROFESSIONAL-NAME-001
- PG-GENERAL-LOCATION-001
- PG-WORK-AUTHORIZATION-001

Defaults remain privacy-first. Original CV and private documents are never employer-visible.

## Registry Behavior
The in-memory registry supports:
- lookup by ID
- lookup by category
- lookup by finding type
- lookup by workflow stage
- lookup by actor role
- effective-date lookup
- active-version resolution
- deprecated/replacement resolution
- organization/tenant-aware lookup
- deterministic ordering

The registry rejects invalid states such as duplicate active IDs, duplicate active versions, invalid or circular replacements, conflicting disclosure constraints, immutable reveal attempts, expired active rules, and disabled enforceable rules.

## Versioning
Supported lifecycle states:
- draft
- active
- deprecated
- scheduled
- disabled

Foundations include scheduled future versions, replacement metadata, history lookup by stable key, and exact version reference support.

## Validation
ProtectionRuleValidator checks:
- ID and semver formats
- disclosure-state validity and conflicts
- immutable restrictions
- policy/business-rule linkage
- workflow/role constraints
- effective windows
- deprecation/replacement consistency
- candidate-friendly wording (non-technical)
- no private paths in rule metadata

## Resolution
ProtectionRuleResolver accepts contextual inputs and returns selected rule, reasons, rejected candidates, policy/business links, action/disclosure defaults, reveal eligibility, blockers, next actions, review requirement, and fallback status.

Fallback is strict privacy when no valid rule matches.

## Decision References and Snapshots
Decisions can persist rule decision references including:
- rule ID/version
- registry version
- policy/business links
- snapshot hash
- resolution/effective timestamps
- fallback/deprecation flags
- review requirement

Rule snapshots are privacy-safe and never include candidate values or original file paths.

## Governance Foundations
Typed foundations added for:
- CreateProtectionRuleCommand
- PublishProtectionRuleVersionCommand
- DeprecateProtectionRuleCommand
- ReplaceProtectionRuleCommand
- DisableProtectionRuleCommand
- GetProtectionRuleQuery
- ListProtectionRulesQuery
- ValidateProtectionRuleQuery
- ResolveProtectionRuleQuery
- GetProtectionRuleHistoryQuery

Only Prime Global staff roles are authorized in these foundations.

## Events
Registry events include:
- ProtectionRuleDrafted
- ProtectionRuleValidated
- ProtectionRulePublished
- ProtectionRuleDeprecated
- ProtectionRuleReplaced
- ProtectionRuleDisabled
- ProtectionRuleResolved
- ProtectionRuleFallbackApplied
- ProtectionRuleValidationFailed

## Privacy and Zero Trust
- No private candidate values in events/audit/evidence payloads.
- Original CV and private document exposure remains impossible.
- Rule metadata avoids sensitive content references.

## Contributor Rules
- Keep candidate-facing explanations simple and non-technical.
- Never create employer-visible rules for original CV/private documents.
- Preserve strict fallback behavior for unmatched contexts.
- Keep Stage 8.75 flags disabled by default.

## Known Limitations
- In-memory registry only (no production persistence yet).
- No production route wiring.
- No external provider integration.
- No stage 9 detector runtime dependencies.
