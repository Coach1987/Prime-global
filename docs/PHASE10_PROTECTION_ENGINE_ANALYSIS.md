# Phase 10 Stage 8: Document and Image Protection Analysis

## Candidate-Friendly Philosophy
- Analysis is silent and protective by default.
- Personal contact information in honest candidate documents is not a rejection trigger.
- The system prepares protection instructions and continues workflow whenever technically safe.
- Candidate-facing text remains non-technical and friendly.

### Candidate Message
For your privacy and to keep recruitment secure, some personal information may be protected automatically in the version shared with employers.

## Stage 8 Pipeline
1. Upload received.
2. Validate file envelope.
3. Quarantine reference created.
4. File type classification.
5. Safe metadata extraction.
6. Text extraction through provider abstraction.
7. Image analysis through provider abstraction.
8. QR and barcode analysis through provider abstraction.
9. Normalize extracted content.
10. Identify protectable data.
11. Calculate confidence.
12. Create protection findings.
13. Create redaction/protected-copy plan.
14. Append audit and timeline references.
15. Continue workflow.

## Provider Abstractions
The Stage 8 foundation adds abstraction contracts only. No paid or external provider is connected.

- OCRProtectionProvider
- QRProtectionProvider
- BarcodeProtectionProvider
- PDFTextExtractionProvider
- DOCXTextExtractionProvider
- ImageAnalysisProvider
- MetadataProtectionProvider
- ArchiveInspectionProvider
- FileTypeDetectionProvider

Deterministic in-memory providers exist for tests under [src/lib/server/phase10/protection-engine/analysis/testing/mock-providers.ts](../src/lib/server/phase10/protection-engine/analysis/testing/mock-providers.ts).

## Supported Categories
Foundation support:
- PDF
- DOC
- DOCX
- PNG
- JPEG
- WEBP

Architecture extension points:
- ZIP
- Additional archive types

No macro execution, script execution, or active content rendering is performed.

## Finding Model
Each finding includes:
- finding ID
- finding type
- source provider
- source file reference
- page number where applicable
- coordinate region where applicable
- normalized excerpt
- redacted excerpt
- confidence level
- confidence score
- explanation
- protection category
- suggested protection action
- evidence reference (when required)
- human review required
- false-positive possible
- detector version
- schema version
- organization scope
- candidate scope
- created timestamp

Finding types supported in Stage 8:
- email
- phone
- URL
- shortened URL
- social handle
- QR code
- barcode
- address
- passport number
- national ID
- personal number
- hidden metadata
- embedded link
- external meeting link
- unknown sensitive pattern

## Confidence Model
- low: observe only.
- medium: include in protection plan.
- high: include in protection plan and optionally show a friendly message.
- very_high: include in protection plan, append evidence reference, and notify Policy Engine for evaluation.

A single finding never causes automatic punishment.

## Protection Plan Model
The plan contains transformation instructions, not final binary file rendering.

Core fields include:
- original object reference
- protected-copy target reference
- public-profile target reference
- findings list
- masking operations
- removal operations
- replacement placeholders
- metadata stripping flag
- QR masking flag
- barcode masking flag
- link neutralization flag
- text redaction flag
- image-region redaction flag
- protection status
- review status
- generated timestamp
- protection version

Statuses:
- pending_analysis
- analysis_complete
- protection_planned
- protection_ready
- review_required
- failed_safe
- cancelled

## Quarantine Lifecycle
Quarantine model includes:
- quarantine ID
- file reference
- candidate ID
- organization ID
- status
- file type
- size
- content hash
- analysis attempt count
- provider results
- protection-plan reference
- expiry timestamp
- review requirement
- failure reason category

Statuses:
- received
- validating
- analyzing
- protection_planning
- ready
- review_required
- failed_safe
- expired

## Three-Copy Model
1. Original copy: private and never shared with employers.
2. Protected copy: recruitment-facing copy with masking/removal instructions.
3. Prime Global Professional Profile: future model, not implemented in Stage 8.

Employer-facing status objects expose only protected readiness and protected reference data.

## Safety and Zero Trust Controls
- Never trust client-submitted file type.
- Never trust client-submitted ownership or storage path.
- Validation uses provider-based type detection and MIME mismatch checks.
- No external resource fetching from uploaded content.
- No active content execution.
- No full sensitive extracted text in audit metadata.
- Provider timeout and extraction timeout return safe-failure outcomes.
- Sensitive processing is server-side only.

Extension points are added for:
- file signature validation
- decompression limits
- page limits
- image-size limits
- extraction timeouts
- provider timeout handling
- safe failure

## Events
Stage 8 analysis events are non-accusatory:
- DocumentQuarantined
- DocumentTypeClassified
- DocumentAnalysisStarted
- DocumentAnalysisCompleted
- ProtectionFindingCreated
- ProtectionPlanCreated
- ProtectedCopyReady
- DocumentReviewRequired
- DocumentAnalysisFailedSafe
- DocumentQuarantineExpired

## Audit and Timeline
Internal audit events capture quarantine and analysis lifecycle operations.

Candidate timeline language remains friendly:
Your document was prepared securely for the recruitment process.

Detector internals and confidence values are not exposed in candidate-facing timeline text.

## Privacy
- Sanitized audit metadata excludes raw extracted text and original object paths.
- Protected outputs preserve hiring workflow utility while reducing direct contact leakage.

## Future Provider Options (Not Implemented)
Possible future integrations can include OCR, QR, barcode, and rendering engines.
Stage 8 deliberately avoids external provider SDKs and paid services.

## Known Limitations
- Binary protected-copy generation is not implemented.
- OCR and document rendering are mock-only.
- Archive extraction is architecture-only.
- Stage 8 does not apply legal classification.

## Stage 8.5 Adaptive and Reversible Extension

### Adaptive Context
Stage 8.5 adds a typed adaptive context that evaluates protection using workflow stage, actor role, policy version, consent version, verification status, payment/contract status, freeze/critical state, and organization/tenant scope.

### Explainable Decisions
Stage 8.5 adds explainable decision records containing policy/rule IDs, evaluated conditions, passed/failed conditions, blocking reasons, next actions, and candidate/employer/internal explanations.

### Field-Level Disclosure Manifest
Field categories now use policy-managed states (`hidden`, `masked`, `summarized`, `protected_placeholder`, `revealed`, `staff_only`).

### Reversible Disclosure
A field-level state machine supports:
- `hidden -> masked -> summarized -> protected_placeholder -> revealed`
- `revealed -> masked`
- `masked -> hidden`

Reveal transitions require policy approval and can fail with structured explainable errors.

### Immutable Restrictions
The following fields remain employer-hidden regardless of reveal requests:
- `original_cv`
- `private_documents`
- `passport_number`
- `national_id`
- `precise_address`

### Command and Query Foundations
Added typed command/query foundations for adaptive level evaluation and reveal lifecycle controls, with integration hooks for workflow, policy, business rule, orchestrator, evidence, audit, timeline, and domain events.

## Contributor Rules
- Keep candidate-facing language friendly and non-technical.
- Never add automatic punishment for single findings.
- Keep analysis features behind disabled-by-default flags.
- Do not connect external providers in Stage 8.
- Do not add production migrations for Stage 8.
