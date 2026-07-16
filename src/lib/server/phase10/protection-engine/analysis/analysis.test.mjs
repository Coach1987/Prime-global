import test from "node:test";
import assert from "node:assert/strict";

import { getPhase10FeatureFlags } from "../../feature-flags/index.ts";
import {
  STAGE8_CANDIDATE_TIMELINE_MESSAGE,
  assertCandidateOwnership,
  createAllEnabledDocumentAnalysisFlags,
  createInMemoryAnalysisIdempotencyStore,
  createInMemoryAnalysisProviderSuite,
  createInMemoryDocumentAnalysisQuarantineRepository,
  expireQuarantineIfNeeded,
  runDocumentProtectionAnalysis,
  sanitizePrivacySafeMetadata,
  toEmployerSafeDocumentStatus,
} from "./index.ts";

function createRequest(overrides = {}) {
  return {
    analysisId: "analysis-1",
    actor: {
      actorId: "candidate-1",
      role: "candidate",
    },
    ownership: {
      candidateId: "candidate-1",
      organizationId: "org-1",
    },
    file: {
      fileName: "cv.pdf",
      declaredMimeType: "application/pdf",
      fileReference: "storage://candidate-private-documents/candidate-1/cv.pdf",
      originalObjectReference: "private://original/candidate-1/cv.pdf",
      protectedCopyTargetReference: "protected://candidate-1/cv-protected.pdf",
      publicProfileTargetReference: "public://candidate-1/profile-v1.json",
      byteSize: 100_000,
      contentHash: "hash-123",
    },
    requestedAt: new Date().toISOString(),
    candidateMessageLocale: "en",
    ...overrides,
  };
}

function createDependencies(overrides = {}) {
  const providers = createInMemoryAnalysisProviderSuite();
  return {
    providers,
    quarantineRepository: createInMemoryDocumentAnalysisQuarantineRepository(),
    idempotencyStore: createInMemoryAnalysisIdempotencyStore(),
    featureFlags: createAllEnabledDocumentAnalysisFlags(),
    ...overrides,
  };
}

test("valid PDF analysis flow", async () => {
  const dependencies = createDependencies();
  const request = createRequest();

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockTextContent: "Contact me on test@candidate.dev and +12025550123",
    },
    dependencies
  );

  assert.equal(outcome.failedSafe, false);
  assert.equal(outcome.quarantine.status, "ready");
  assert.ok(outcome.findings.length >= 2);
  assert.equal(outcome.protectionPlan?.protectionStatus, "protection_planned");
});

test("valid DOCX analysis flow", async () => {
  const dependencies = createDependencies();
  const request = createRequest({
    analysisId: "analysis-docx",
    file: {
      ...createRequest().file,
      fileName: "resume.docx",
      declaredMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockTextContent: "Portfolio https://example.com and profile bit.ly/profile",
    },
    dependencies
  );

  assert.equal(outcome.failedSafe, false);
  assert.equal(outcome.quarantine.fileType, "docx");
  assert.ok(outcome.findings.some((finding) => finding.findingType === "shortened_url"));
});

test("valid image analysis flow", async () => {
  const dependencies = createDependencies();
  const request = createRequest({
    analysisId: "analysis-image",
    file: {
      ...createRequest().file,
      fileName: "scan.png",
      declaredMimeType: "image/png",
    },
  });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockImageSignals: [
        {
          type: "qr_code",
          content: "https://example.com/contact",
          confidence: 0.87,
          region: { x: 1, y: 2, width: 30, height: 30, unit: "pixel" },
        },
      ],
    },
    dependencies
  );

  assert.equal(outcome.failedSafe, false);
  assert.ok(outcome.findings.some((finding) => finding.findingType === "qr_code"));
  assert.equal(outcome.protectionPlan?.qrMasking, true);
});

test("unsupported file safe failure", async () => {
  const dependencies = createDependencies();
  const request = createRequest({
    analysisId: "analysis-unsupported",
    file: {
      ...createRequest().file,
      fileName: "payload.exe",
      declaredMimeType: "application/octet-stream",
    },
  });

  const outcome = await runDocumentProtectionAnalysis({ request }, dependencies);

  assert.equal(outcome.failedSafe, true);
  assert.equal(outcome.quarantine.failureReasonCategory, "unsupported_file_type");
});

test("MIME spoofing detection foundation", async () => {
  const base = createInMemoryAnalysisProviderSuite();
  base.fileTypeDetectionProvider = {
    providerName: "file-type-detection",
    async detectFileType() {
      return {
        category: "pdf",
        extension: "pdf",
        mimeType: "application/pdf",
        trustedBySignature: true,
        spoofingSuspected: false,
      };
    },
  };

  const dependencies = createDependencies({ providers: base });
  const request = createRequest({
    analysisId: "analysis-spoof",
    file: {
      ...createRequest().file,
      declaredMimeType: "image/png",
    },
  });

  const outcome = await runDocumentProtectionAnalysis({ request }, dependencies);

  assert.equal(outcome.failedSafe, true);
  assert.equal(outcome.quarantine.failureReasonCategory, "mime_spoofing_suspected");
});

test("low-confidence finding", async () => {
  const dependencies = createDependencies();
  const request = createRequest({
    analysisId: "analysis-low",
    file: {
      ...createRequest().file,
      fileName: "scan.webp",
      declaredMimeType: "image/webp",
    },
  });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockImageSignals: [{ type: "unknown_sensitive_pattern", content: "x", confidence: 0.2 }],
    },
    dependencies
  );

  const finding = outcome.findings.find((item) => item.findingType === "unknown_sensitive_pattern");
  assert.ok(finding);
  assert.equal(finding.confidenceLevel, "low");
});

test("medium-confidence protection plan", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-medium" });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockTextContent: "My id is 1234567890",
    },
    dependencies
  );

  const finding = outcome.findings.find((item) => item.findingType === "national_id");
  assert.ok(finding);
  assert.equal(finding.confidenceLevel, "medium");
  assert.equal(outcome.protectionPlan?.textRedaction, true);
});

test("high-confidence friendly-notification plan", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-high" });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockTextContent: "Reach me at high@confidence.dev",
    },
    dependencies
  );

  assert.ok(outcome.findings.some((item) => item.confidenceLevel === "high"));
  assert.match(outcome.candidateNotification ?? "", /protected automatically/i);
});

test("very-high-confidence evidence reference", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-very-high" });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockTextContent: "Meeting link https://zoom.us/j/123456789",
    },
    dependencies
  );

  const veryHigh = outcome.findings.find((item) => item.confidenceLevel === "very_high");
  assert.ok(veryHigh);
  assert.ok(veryHigh.evidenceReference);
  assert.equal(outcome.policyEngineNotified, true);
});

test("no automatic punishment", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-no-punishment" });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockTextContent: "Contact me on test@candidate.dev",
    },
    dependencies
  );

  assert.notEqual(outcome.quarantine.status, "failed_safe");
});

test("original copy never exposed", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-original-safe" });

  const outcome = await runDocumentProtectionAnalysis({ request, mockTextContent: "test@candidate.dev" }, dependencies);
  const employerStatus = toEmployerSafeDocumentStatus(outcome);

  assert.equal("originalObjectReference" in employerStatus, false);
  assert.equal(JSON.stringify(employerStatus).includes("private://original"), false);
});

test("employer receives protected status only", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-employer-status" });

  const outcome = await runDocumentProtectionAnalysis({ request, mockTextContent: "test@candidate.dev" }, dependencies);
  const employerStatus = toEmployerSafeDocumentStatus(outcome);

  assert.equal(employerStatus.protectedCopyReady, true);
  assert.ok(employerStatus.protectedCopyReference?.startsWith("protected://"));
});

test("quarantine lifecycle", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-quarantine" });

  const outcome = await runDocumentProtectionAnalysis({ request, mockTextContent: "test@candidate.dev" }, dependencies);

  assert.equal(outcome.quarantine.status, "ready");
  assert.equal(outcome.quarantine.analysisAttemptCount > 0, true);
  assert.equal(outcome.quarantine.protectionPlanReference, outcome.protectionPlan?.planId ?? null);
});

test("quarantine expiry", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-expiry" });

  const outcome = await runDocumentProtectionAnalysis({ request, mockTextContent: "test@candidate.dev" }, dependencies);

  const expired = expireQuarantineIfNeeded("2099-01-01T00:00:00.000Z", {
    ...outcome.quarantine,
    expiryTimestamp: "2000-01-01T00:00:00.000Z",
  });

  assert.equal(expired.status, "expired");
});

test("provider timeout safe failure", async () => {
  const providers = createInMemoryAnalysisProviderSuite();
  providers.pdfTextExtractionProvider = {
    providerName: "pdf-text-extraction",
    async extractPdfText() {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { extractedText: "", pageCount: 1, embeddedLinks: [] };
    },
  };

  const dependencies = createDependencies({
    providers,
    safetyLimits: {
      maxFileSizeBytes: 1024 * 1024,
      maxPages: 10,
      maxImagePixels: 1024 * 1024,
      maxArchiveDepth: 2,
      extractionTimeoutMs: 1,
      providerTimeoutMs: 1,
    },
  });

  const request = createRequest({ analysisId: "analysis-timeout" });
  const outcome = await runDocumentProtectionAnalysis({ request }, dependencies);

  assert.equal(outcome.failedSafe, true);
  assert.equal(outcome.quarantine.failureReasonCategory, "provider_timeout");
});

test("duplicate analysis idempotency", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-idempotent" });

  const first = await runDocumentProtectionAnalysis({ request, mockTextContent: "test@candidate.dev" }, dependencies);
  const second = await runDocumentProtectionAnalysis({ request, mockTextContent: "different@input.dev" }, dependencies);

  assert.deepEqual(second, first);
});

test("cross-organization denial", () => {
  const request = createRequest({
    ownership: {
      candidateId: "candidate-1",
      organizationId: "org-2",
    },
  });

  assert.throws(() => assertCandidateOwnership(request, "candidate-1", "org-1"), /cross_organization_denied/);
});

test("candidate ownership denial", () => {
  const request = createRequest({
    ownership: {
      candidateId: "candidate-2",
      organizationId: "org-1",
    },
  });

  assert.throws(() => assertCandidateOwnership(request, "candidate-1", "org-1"), /candidate_ownership_denied/);
});

test("metadata stripping plan", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-metadata" });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockMetadataKeys: ["Author", "GPSLocation"],
    },
    dependencies
  );

  assert.equal(outcome.protectionPlan?.metadataStripping, true);
});

test("QR masking plan", async () => {
  const dependencies = createDependencies();
  const request = createRequest({
    analysisId: "analysis-qr",
    file: {
      ...createRequest().file,
      fileName: "scan.jpg",
      declaredMimeType: "image/jpeg",
    },
  });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockImageSignals: [{ type: "qr_code", content: "qr://contact", confidence: 0.7 }],
    },
    dependencies
  );

  assert.equal(outcome.protectionPlan?.qrMasking, true);
});

test("barcode masking plan", async () => {
  const dependencies = createDependencies();
  const request = createRequest({
    analysisId: "analysis-barcode",
    file: {
      ...createRequest().file,
      fileName: "scan.jpg",
      declaredMimeType: "image/jpeg",
    },
  });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockImageSignals: [{ type: "barcode", content: "123456", confidence: 0.71 }],
    },
    dependencies
  );

  assert.equal(outcome.protectionPlan?.barcodeMasking, true);
});

test("URL neutralization plan", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-neutralize" });

  const outcome = await runDocumentProtectionAnalysis(
    {
      request,
      mockTextContent: "Join at https://example.com/private",
    },
    dependencies
  );

  assert.equal(outcome.protectionPlan?.linkNeutralization, true);
});

test("privacy-safe logs", () => {
  const metadata = sanitizePrivacySafeMetadata({
    rawExtractedText: "very private text",
    fullText: "another private text",
    summary: "safe summary",
  });

  assert.equal("rawExtractedText" in metadata, false);
  assert.equal("fullText" in metadata, false);
  assert.equal(metadata.summary, "safe summary");
});

test("candidate-friendly timeline text", async () => {
  const dependencies = createDependencies();
  const request = createRequest({ analysisId: "analysis-timeline" });

  const outcome = await runDocumentProtectionAnalysis({ request, mockTextContent: "test@candidate.dev" }, dependencies);

  assert.equal(outcome.timelineEntry.message, STAGE8_CANDIDATE_TIMELINE_MESSAGE);
});

test("feature flags disabled by default", () => {
  const flags = getPhase10FeatureFlags();

  assert.equal(flags.DOCUMENT_ANALYSIS_ENABLED, false);
  assert.equal(flags.IMAGE_ANALYSIS_ENABLED, false);
  assert.equal(flags.PDF_TEXT_EXTRACTION_ENABLED, false);
  assert.equal(flags.DOCX_TEXT_EXTRACTION_ENABLED, false);
  assert.equal(flags.QR_ANALYSIS_ENABLED, false);
  assert.equal(flags.BARCODE_ANALYSIS_ENABLED, false);
  assert.equal(flags.METADATA_PROTECTION_ENABLED, false);
  assert.equal(flags.DOCUMENT_QUARANTINE_ENABLED, false);
  assert.equal(flags.PROTECTION_PLAN_ENABLED, false);
  assert.equal(flags.DOCUMENT_REVIEW_ENABLED, false);
  assert.equal(flags.ADAPTIVE_PROTECTION_ENABLED, false);
  assert.equal(flags.EXPLAINABLE_PROTECTION_ENABLED, false);
  assert.equal(flags.REVERSIBLE_PROTECTION_ENABLED, false);
  assert.equal(flags.FIELD_LEVEL_DISCLOSURE_ENABLED, false);
  assert.equal(flags.PARTIAL_REVEAL_ENABLED, false);
  assert.equal(flags.REVEAL_APPROVAL_ENABLED, false);
  assert.equal(flags.DISCLOSURE_MANIFEST_ENABLED, false);
});
