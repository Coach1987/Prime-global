import type {
  DocumentAnalysisQuarantine,
  ProviderResultEnvelope,
  QuarantineFailureReasonCategory,
  QuarantineStatus,
  SupportedFileCategory,
} from "./types.ts";

export function createQuarantineRecord(input: {
  quarantineId: string;
  fileReference: string;
  candidateId: string;
  organizationId: string;
  size: number;
  contentHash: string;
  fileType: SupportedFileCategory;
  expiryTimestamp: string;
}): DocumentAnalysisQuarantine {
  return {
    quarantineId: input.quarantineId,
    fileReference: input.fileReference,
    candidateId: input.candidateId,
    organizationId: input.organizationId,
    status: "received",
    fileType: input.fileType,
    size: input.size,
    contentHash: input.contentHash,
    analysisAttemptCount: 0,
    providerResults: [],
    protectionPlanReference: null,
    expiryTimestamp: input.expiryTimestamp,
    reviewRequirement: false,
    failureReasonCategory: null,
  };
}

export function transitionQuarantineStatus(
  quarantine: DocumentAnalysisQuarantine,
  status: QuarantineStatus,
  failureReasonCategory?: QuarantineFailureReasonCategory
): DocumentAnalysisQuarantine {
  return {
    ...quarantine,
    status,
    failureReasonCategory: failureReasonCategory ?? quarantine.failureReasonCategory,
    reviewRequirement: status === "review_required" || quarantine.reviewRequirement,
  };
}

export function appendProviderResult(
  quarantine: DocumentAnalysisQuarantine,
  providerResult: ProviderResultEnvelope
): DocumentAnalysisQuarantine {
  return {
    ...quarantine,
    analysisAttemptCount: quarantine.analysisAttemptCount + 1,
    providerResults: [...quarantine.providerResults, providerResult],
  };
}

export function markQuarantineReady(
  quarantine: DocumentAnalysisQuarantine,
  protectionPlanReference: string
): DocumentAnalysisQuarantine {
  return {
    ...quarantine,
    status: "ready",
    protectionPlanReference,
  };
}

export function expireQuarantine(quarantine: DocumentAnalysisQuarantine): DocumentAnalysisQuarantine {
  return {
    ...quarantine,
    status: "expired",
  };
}
