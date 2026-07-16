import { shouldAppendEvidence, shouldNotifyCandidate, shouldNotifyPolicyEngine } from "./confidence.ts";
import { createCandidateFriendlyTimelineEntry, createAuditEntry } from "./audit.ts";
import { createAnalysisEvent } from "./events.ts";
import { createFindingsFromText, createProviderFinding } from "./findings.ts";
import { createFailedSafePlan, createProtectionPlan } from "./protection-plan.ts";
import {
  appendProviderResult,
  createQuarantineRecord,
  expireQuarantine,
  markQuarantineReady,
  transitionQuarantineStatus,
} from "./quarantine.ts";
import type { AnalysisProviderSuite, ProviderInvocationInput } from "./providers/types.ts";
import type { DocumentAnalysisQuarantineRepository } from "./repositories/quarantine-repository.ts";
import type {
  AnalysisOutcome,
  AnalysisRequest,
  AnalysisSafetyLimits,
  DocumentAnalysisAuditEntry,
  EmployerSafeDocumentStatus,
  ProviderResultEnvelope,
  ProtectionFinding,
  ProtectionPlan,
  QuarantineFailureReasonCategory,
  SupportedFileCategory,
} from "./types.ts";
import type { AnalysisIdempotencyStore } from "./types.ts";
import type { DocumentAnalysisFeatureFlags } from "./feature-flags.ts";

const CANDIDATE_NOTICE =
  "For your privacy and to keep recruitment secure, some personal information may be protected automatically in the version shared with employers.";

const SUPPORTED_FILE_TYPES = new Set<SupportedFileCategory>(["pdf", "doc", "docx", "png", "jpeg", "webp"]);

const DEFAULT_LIMITS: AnalysisSafetyLimits = {
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxPages: 50,
  maxImagePixels: 36_000_000,
  maxArchiveDepth: 3,
  extractionTimeoutMs: 4_000,
  providerTimeoutMs: 2_500,
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<{ timeout: boolean; result: T | null; durationMs: number }> {
  const startedAt = Date.now();

  const timeout = new Promise<{ timeout: boolean; result: T | null; durationMs: number }>((resolve) => {
    setTimeout(() => {
      resolve({ timeout: true, result: null, durationMs: Date.now() - startedAt });
    }, timeoutMs);
  });

  const wrapped = promise
    .then((result) => ({ timeout: false, result, durationMs: Date.now() - startedAt }))
    .catch(() => ({ timeout: true, result: null, durationMs: Date.now() - startedAt }));

  return Promise.race([wrapped, timeout]);
}

function nowPlusMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function inferFailureReason(input: {
  unsupported?: boolean;
  spoofing?: boolean;
  timeout?: boolean;
  fileSizeExceeded?: boolean;
}): QuarantineFailureReasonCategory {
  if (input.fileSizeExceeded) return "size_limit";
  if (input.spoofing) return "mime_spoofing_suspected";
  if (input.unsupported) return "unsupported_file_type";
  if (input.timeout) return "provider_timeout";
  return "unknown";
}

function fileTypeMatchesDeclaredMime(category: SupportedFileCategory, declaredMimeType: string): boolean {
  const normalized = declaredMimeType.toLowerCase();

  if (category === "pdf") return normalized.includes("pdf");
  if (category === "doc") return normalized.includes("msword");
  if (category === "docx") return normalized.includes("officedocument.wordprocessingml.document");
  if (category === "png") return normalized.includes("image/png");
  if (category === "jpeg") return normalized.includes("image/jpeg") || normalized.includes("image/jpg");
  if (category === "webp") return normalized.includes("image/webp");

  return false;
}

function createProviderEnvelope(input: {
  provider: ProviderResultEnvelope["provider"];
  success: boolean;
  summary: string;
  confidenceScore: number;
  findings?: Array<Partial<ProtectionFinding>>;
  durationMs: number;
  timeout: boolean;
}): ProviderResultEnvelope {
  return {
    provider: input.provider,
    success: input.success,
    summary: input.summary,
    confidenceScore: input.confidenceScore,
    findings: input.findings ?? [],
    durationMs: input.durationMs,
    timeout: input.timeout,
    schemaVersion: "stage8.provider-result.v1",
  };
}

export interface AnalysisPipelineDependencies {
  providers: AnalysisProviderSuite;
  quarantineRepository: DocumentAnalysisQuarantineRepository;
  idempotencyStore: AnalysisIdempotencyStore;
  featureFlags: DocumentAnalysisFeatureFlags;
  safetyLimits?: AnalysisSafetyLimits;
}

export interface AnalysisPipelineRunInput {
  request: AnalysisRequest;
  mockTextContent?: string;
  mockImageSignals?: ProviderInvocationInput["mockImageSignals"];
  mockMetadataKeys?: string[];
}

export async function runDocumentProtectionAnalysis(
  input: AnalysisPipelineRunInput,
  dependencies: AnalysisPipelineDependencies
): Promise<AnalysisOutcome> {
  const existing = await dependencies.idempotencyStore.get(input.request.analysisId);
  if (existing) return existing;

  const limits = dependencies.safetyLimits ?? DEFAULT_LIMITS;
  const auditEntries: DocumentAnalysisAuditEntry[] = [];

  const typeDetection = await withTimeout(
    dependencies.providers.fileTypeDetectionProvider.detectFileType({
      fileName: input.request.file.fileName,
      declaredMimeType: input.request.file.declaredMimeType,
      byteSize: input.request.file.byteSize,
      contentHash: input.request.file.contentHash,
    }),
    limits.providerTimeoutMs
  );

  const detectedFileType = typeDetection.result?.category ?? "unknown";
  let quarantine = createQuarantineRecord({
    quarantineId: `quarantine:${input.request.analysisId}`,
    fileReference: input.request.file.fileReference,
    candidateId: input.request.ownership.candidateId,
    organizationId: input.request.ownership.organizationId,
    size: input.request.file.byteSize,
    contentHash: input.request.file.contentHash,
    fileType: detectedFileType,
    expiryTimestamp: nowPlusMinutes(30),
  });

  quarantine = transitionQuarantineStatus(quarantine, "validating");
  await dependencies.quarantineRepository.save(quarantine);

  auditEntries.push(createAuditEntry({ quarantineId: quarantine.quarantineId, event: "quarantine_created" }));
  auditEntries.push(
    createAuditEntry({
      quarantineId: quarantine.quarantineId,
      event: "provider_invoked",
      provider: "file-type-detection",
      metadata: { trustedBySignature: typeDetection.result?.trustedBySignature ?? false },
    })
  );

  const typeEnvelope = createProviderEnvelope({
    provider: "file-type-detection",
    success: !typeDetection.timeout,
    summary: typeDetection.timeout ? "File type provider timeout." : `Detected file type ${detectedFileType}`,
    confidenceScore: typeDetection.result?.trustedBySignature ? 0.95 : 0.2,
    durationMs: typeDetection.durationMs,
    timeout: typeDetection.timeout,
  });
  quarantine = appendProviderResult(quarantine, typeEnvelope);

  const validationSpoofing =
    Boolean(typeDetection.result?.spoofingSuspected) ||
    Boolean(
      typeDetection.result &&
        SUPPORTED_FILE_TYPES.has(typeDetection.result.category) &&
        !fileTypeMatchesDeclaredMime(typeDetection.result.category, input.request.file.declaredMimeType)
    );

  const fileSizeExceeded = input.request.file.byteSize > limits.maxFileSizeBytes;
  const unsupported = !SUPPORTED_FILE_TYPES.has(detectedFileType);

  if (
    !dependencies.featureFlags.DOCUMENT_ANALYSIS_ENABLED ||
    !dependencies.featureFlags.DOCUMENT_QUARANTINE_ENABLED ||
    typeDetection.timeout ||
    validationSpoofing ||
    fileSizeExceeded ||
    unsupported
  ) {
    const failedReason = inferFailureReason({
      unsupported,
      spoofing: Boolean(validationSpoofing),
      timeout: typeDetection.timeout,
      fileSizeExceeded,
    });

    quarantine = transitionQuarantineStatus(quarantine, "failed_safe", failedReason);
    await dependencies.quarantineRepository.save(quarantine);

    const failedPlan = createFailedSafePlan({
      planId: `plan:${input.request.analysisId}`,
      originalObjectReference: input.request.file.originalObjectReference,
      protectedCopyTargetReference: input.request.file.protectedCopyTargetReference,
      publicProfileTargetReference: input.request.file.publicProfileTargetReference,
    });

    const outcome: AnalysisOutcome = {
      analysisId: input.request.analysisId,
      quarantine,
      findings: [],
      protectionPlan: failedPlan,
      candidateNotification: null,
      timelineEntry: createCandidateFriendlyTimelineEntry(),
      auditEntries: [
        ...auditEntries,
        createAuditEntry({
          quarantineId: quarantine.quarantineId,
          event: "failed_safe_result",
          metadata: { reason: failedReason },
        }),
      ],
      policyEngineNotified: false,
      failedSafe: true,
    };

    await dependencies.idempotencyStore.set(outcome);
    return outcome;
  }

  quarantine = transitionQuarantineStatus(quarantine, "analyzing");
  await dependencies.quarantineRepository.save(quarantine);

  const findings: ProtectionFinding[] = [];

  const providerInput: ProviderInvocationInput = {
    fileName: input.request.file.fileName,
    declaredMimeType: input.request.file.declaredMimeType,
    byteSize: input.request.file.byteSize,
    contentHash: input.request.file.contentHash,
    mockTextContent: input.mockTextContent,
    mockImageSignals: input.mockImageSignals,
    mockMetadataKeys: input.mockMetadataKeys,
  };

  const analyzeStartEvent = createAnalysisEvent({
    eventType: "DocumentAnalysisStarted",
    analysisId: input.request.analysisId,
    quarantineId: quarantine.quarantineId,
  });
  auditEntries.push(
    createAuditEntry({
      quarantineId: quarantine.quarantineId,
      event: "analysis_started",
      metadata: { eventType: analyzeStartEvent.eventType },
    })
  );

  if (detectedFileType === "pdf" && dependencies.featureFlags.PDF_TEXT_EXTRACTION_ENABLED) {
    const textResult = await withTimeout(dependencies.providers.pdfTextExtractionProvider.extractPdfText(providerInput), limits.extractionTimeoutMs);
    const envelope = createProviderEnvelope({
      provider: "pdf-text-extraction",
      success: !textResult.timeout,
      summary: textResult.timeout ? "PDF extraction timeout" : "PDF text extracted",
      confidenceScore: textResult.timeout ? 0 : 0.8,
      durationMs: textResult.durationMs,
      timeout: textResult.timeout,
    });

    quarantine = appendProviderResult(quarantine, envelope);

    if (textResult.timeout) {
      quarantine = transitionQuarantineStatus(quarantine, "failed_safe", "provider_timeout");
      await dependencies.quarantineRepository.save(quarantine);
      const outcome: AnalysisOutcome = {
        analysisId: input.request.analysisId,
        quarantine,
        findings: [],
        protectionPlan: createFailedSafePlan({
          planId: `plan:${input.request.analysisId}`,
          originalObjectReference: input.request.file.originalObjectReference,
          protectedCopyTargetReference: input.request.file.protectedCopyTargetReference,
          publicProfileTargetReference: input.request.file.publicProfileTargetReference,
        }),
        candidateNotification: null,
        timelineEntry: createCandidateFriendlyTimelineEntry(),
        auditEntries: [
          ...auditEntries,
          createAuditEntry({ quarantineId: quarantine.quarantineId, event: "failed_safe_result", metadata: { reason: "provider_timeout" } }),
        ],
        policyEngineNotified: false,
        failedSafe: true,
      };
      await dependencies.idempotencyStore.set(outcome);
      return outcome;
    }

    findings.push(
      ...createFindingsFromText({
        text: textResult.result?.extractedText ?? "",
        provider: "pdf-text-extraction",
        sourceFileReference: input.request.file.fileReference,
        organizationScope: input.request.ownership.organizationId,
        candidateScope: input.request.ownership.candidateId,
      })
    );
  }

  if (["doc", "docx"].includes(detectedFileType) && dependencies.featureFlags.DOCX_TEXT_EXTRACTION_ENABLED) {
    const textResult = await withTimeout(dependencies.providers.docxTextExtractionProvider.extractDocxText(providerInput), limits.extractionTimeoutMs);
    const envelope = createProviderEnvelope({
      provider: "docx-text-extraction",
      success: !textResult.timeout,
      summary: textResult.timeout ? "DOCX extraction timeout" : "DOCX text extracted",
      confidenceScore: textResult.timeout ? 0 : 0.78,
      durationMs: textResult.durationMs,
      timeout: textResult.timeout,
    });
    quarantine = appendProviderResult(quarantine, envelope);

    if (textResult.timeout) {
      quarantine = transitionQuarantineStatus(quarantine, "failed_safe", "provider_timeout");
      await dependencies.quarantineRepository.save(quarantine);
      const outcome: AnalysisOutcome = {
        analysisId: input.request.analysisId,
        quarantine,
        findings: [],
        protectionPlan: createFailedSafePlan({
          planId: `plan:${input.request.analysisId}`,
          originalObjectReference: input.request.file.originalObjectReference,
          protectedCopyTargetReference: input.request.file.protectedCopyTargetReference,
          publicProfileTargetReference: input.request.file.publicProfileTargetReference,
        }),
        candidateNotification: null,
        timelineEntry: createCandidateFriendlyTimelineEntry(),
        auditEntries: [
          ...auditEntries,
          createAuditEntry({ quarantineId: quarantine.quarantineId, event: "failed_safe_result", metadata: { reason: "provider_timeout" } }),
        ],
        policyEngineNotified: false,
        failedSafe: true,
      };
      await dependencies.idempotencyStore.set(outcome);
      return outcome;
    }

    findings.push(
      ...createFindingsFromText({
        text: textResult.result?.extractedText ?? "",
        provider: "docx-text-extraction",
        sourceFileReference: input.request.file.fileReference,
        organizationScope: input.request.ownership.organizationId,
        candidateScope: input.request.ownership.candidateId,
      })
    );
  }

  if (["png", "jpeg", "webp"].includes(detectedFileType) && dependencies.featureFlags.IMAGE_ANALYSIS_ENABLED) {
    const imageResult = await withTimeout(dependencies.providers.imageAnalysisProvider.analyzeImage(providerInput), limits.extractionTimeoutMs);
    const imageEnvelope = createProviderEnvelope({
      provider: "image-analysis",
      success: !imageResult.timeout,
      summary: imageResult.timeout ? "Image analysis timeout" : "Image analysis complete",
      confidenceScore: imageResult.timeout ? 0 : 0.8,
      durationMs: imageResult.durationMs,
      timeout: imageResult.timeout,
    });
    quarantine = appendProviderResult(quarantine, imageEnvelope);

    if (imageResult.timeout) {
      quarantine = transitionQuarantineStatus(quarantine, "failed_safe", "provider_timeout");
      await dependencies.quarantineRepository.save(quarantine);
      const outcome: AnalysisOutcome = {
        analysisId: input.request.analysisId,
        quarantine,
        findings: [],
        protectionPlan: createFailedSafePlan({
          planId: `plan:${input.request.analysisId}`,
          originalObjectReference: input.request.file.originalObjectReference,
          protectedCopyTargetReference: input.request.file.protectedCopyTargetReference,
          publicProfileTargetReference: input.request.file.publicProfileTargetReference,
        }),
        candidateNotification: null,
        timelineEntry: createCandidateFriendlyTimelineEntry(),
        auditEntries: [
          ...auditEntries,
          createAuditEntry({ quarantineId: quarantine.quarantineId, event: "failed_safe_result", metadata: { reason: "provider_timeout" } }),
        ],
        policyEngineNotified: false,
        failedSafe: true,
      };
      await dependencies.idempotencyStore.set(outcome);
      return outcome;
    }

    for (const detection of imageResult.result?.detections ?? []) {
      findings.push(
        createProviderFinding({
          findingType: detection.type,
          provider: "image-analysis",
          sourceFileReference: input.request.file.fileReference,
          organizationScope: input.request.ownership.organizationId,
          candidateScope: input.request.ownership.candidateId,
          excerpt: detection.content,
          confidenceScore: detection.confidence,
          explanation: "Image signal found during safe analysis.",
          pageNumber: detection.pageNumber ?? null,
          region: detection.region,
        })
      );
    }
  }

  if (dependencies.featureFlags.METADATA_PROTECTION_ENABLED) {
    const metadataResult = await withTimeout(dependencies.providers.metadataProtectionProvider.inspectMetadata(providerInput), limits.providerTimeoutMs);

    const metadataEnvelope = createProviderEnvelope({
      provider: "metadata-protection",
      success: !metadataResult.timeout,
      summary: metadataResult.timeout ? "Metadata inspection timeout" : "Metadata inspection complete",
      confidenceScore: metadataResult.timeout ? 0 : 0.8,
      durationMs: metadataResult.durationMs,
      timeout: metadataResult.timeout,
    });
    quarantine = appendProviderResult(quarantine, metadataEnvelope);

    if (!metadataResult.timeout) {
      for (const key of metadataResult.result?.hiddenMetadataKeys ?? []) {
        findings.push(
          createProviderFinding({
            findingType: "hidden_metadata",
            provider: "metadata-protection",
            sourceFileReference: input.request.file.fileReference,
            organizationScope: input.request.ownership.organizationId,
            candidateScope: input.request.ownership.candidateId,
            excerpt: key,
            confidenceScore: 0.85,
            explanation: "Hidden metadata should be stripped from shared copy.",
          })
        );
      }
    }
  }

  if (dependencies.featureFlags.QR_ANALYSIS_ENABLED) {
    const qrResult = await withTimeout(dependencies.providers.qrProtectionProvider.detectQr(providerInput), limits.providerTimeoutMs);
    quarantine = appendProviderResult(
      quarantine,
      createProviderEnvelope({
        provider: "qr-protection",
        success: !qrResult.timeout,
        summary: qrResult.timeout ? "QR provider timeout" : "QR analysis complete",
        confidenceScore: qrResult.timeout ? 0 : 0.82,
        durationMs: qrResult.durationMs,
        timeout: qrResult.timeout,
      })
    );

    if (!qrResult.timeout) {
      for (const detection of qrResult.result?.detections ?? []) {
        findings.push(
          createProviderFinding({
            findingType: "qr_code",
            provider: "qr-protection",
            sourceFileReference: input.request.file.fileReference,
            organizationScope: input.request.ownership.organizationId,
            candidateScope: input.request.ownership.candidateId,
            excerpt: detection.content,
            confidenceScore: detection.confidence,
            explanation: "QR data should be protected in shared copy.",
            pageNumber: detection.pageNumber,
            region: detection.region,
          })
        );
      }
    }
  }

  if (dependencies.featureFlags.BARCODE_ANALYSIS_ENABLED) {
    const barcodeResult = await withTimeout(dependencies.providers.barcodeProtectionProvider.detectBarcode(providerInput), limits.providerTimeoutMs);
    quarantine = appendProviderResult(
      quarantine,
      createProviderEnvelope({
        provider: "barcode-protection",
        success: !barcodeResult.timeout,
        summary: barcodeResult.timeout ? "Barcode provider timeout" : "Barcode analysis complete",
        confidenceScore: barcodeResult.timeout ? 0 : 0.82,
        durationMs: barcodeResult.durationMs,
        timeout: barcodeResult.timeout,
      })
    );

    if (!barcodeResult.timeout) {
      for (const detection of barcodeResult.result?.detections ?? []) {
        findings.push(
          createProviderFinding({
            findingType: "barcode",
            provider: "barcode-protection",
            sourceFileReference: input.request.file.fileReference,
            organizationScope: input.request.ownership.organizationId,
            candidateScope: input.request.ownership.candidateId,
            excerpt: detection.content,
            confidenceScore: detection.confidence,
            explanation: "Barcode data should be protected in shared copy.",
            pageNumber: detection.pageNumber,
            region: detection.region,
          })
        );
      }
    }
  }

  quarantine = transitionQuarantineStatus(quarantine, "protection_planning");

  const protectionPlan: ProtectionPlan | null = dependencies.featureFlags.PROTECTION_PLAN_ENABLED
    ? createProtectionPlan({
        planId: `plan:${input.request.analysisId}`,
        originalObjectReference: input.request.file.originalObjectReference,
        protectedCopyTargetReference: input.request.file.protectedCopyTargetReference,
        publicProfileTargetReference: input.request.file.publicProfileTargetReference,
        findings,
      })
    : null;

  if (protectionPlan) {
    quarantine = markQuarantineReady(quarantine, protectionPlan.planId);
  }

  await dependencies.quarantineRepository.save(quarantine);

  const policyEngineNotified = findings.some((finding) => shouldNotifyPolicyEngine(finding.confidenceLevel));
  const candidateNotification = findings.some((finding) => shouldNotifyCandidate(finding.confidenceLevel)) ? CANDIDATE_NOTICE : null;

  const evidenceFindings = findings.filter((finding) => shouldAppendEvidence(finding.confidenceLevel));
  for (const finding of evidenceFindings) {
    finding.evidenceReference = finding.evidenceReference ?? `evidence:${finding.findingId}`;
  }

  const outcome: AnalysisOutcome = {
    analysisId: input.request.analysisId,
    quarantine,
    findings,
    protectionPlan,
    candidateNotification,
    timelineEntry: createCandidateFriendlyTimelineEntry(),
    auditEntries: [
      ...auditEntries,
      createAuditEntry({ quarantineId: quarantine.quarantineId, event: "analysis_completed" }),
      ...findings.map((finding) =>
        createAuditEntry({
          quarantineId: quarantine.quarantineId,
          event: "finding_created",
          provider: finding.sourceProvider,
          metadata: {
            findingType: finding.findingType,
            confidenceLevel: finding.confidenceLevel,
            confidenceScore: finding.confidenceScore,
          },
        })
      ),
      createAuditEntry({
        quarantineId: quarantine.quarantineId,
        event: "protection_plan_created",
        metadata: {
          planId: protectionPlan?.planId ?? null,
          findingCount: findings.length,
        },
      }),
    ],
    policyEngineNotified,
    failedSafe: false,
  };

  await dependencies.idempotencyStore.set(outcome);
  return outcome;
}

export function expireQuarantineIfNeeded(nowIso: string, quarantine: AnalysisOutcome["quarantine"]): AnalysisOutcome["quarantine"] {
  if (new Date(quarantine.expiryTimestamp).getTime() > new Date(nowIso).getTime()) {
    return quarantine;
  }

  return expireQuarantine(quarantine);
}

export function toEmployerSafeDocumentStatus(outcome: AnalysisOutcome): EmployerSafeDocumentStatus {
  return {
    analysisId: outcome.analysisId,
    candidateId: outcome.quarantine.candidateId,
    organizationId: outcome.quarantine.organizationId,
    protectedCopyReady: outcome.quarantine.status === "ready",
    protectionStatus: outcome.protectionPlan?.protectionStatus ?? "pending_analysis",
    protectedCopyReference: outcome.protectionPlan?.protectedCopyTargetReference ?? null,
  };
}

export function assertCandidateOwnership(request: AnalysisRequest, authenticatedCandidateId: string, authenticatedOrganizationId: string): void {
  if (request.actor.role !== "candidate") return;

  if (request.ownership.candidateId !== authenticatedCandidateId) {
    throw new Error("candidate_ownership_denied");
  }

  if (request.ownership.organizationId !== authenticatedOrganizationId) {
    throw new Error("cross_organization_denied");
  }
}
