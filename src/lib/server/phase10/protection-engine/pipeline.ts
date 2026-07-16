import { createPGPEProtectionAuditRecord } from "./audit.ts";
import { createPGPEProtectionEvents } from "./events.ts";
import { createRedactionEngine } from "./redaction.ts";
import { createPGPEProtectionTimelineEvent } from "./timeline.ts";
import type {
  PGPEDocumentModelArchitecture,
  PGPEPipelineStep,
  PGPEProtectionDecision,
  PGPEProtectionObservation,
  PGPEProtectionResult,
  PGPEProviderResult,
  PGPEReviewStatus,
} from "./types.ts";

export const PGPE_USER_FRIENDLY_MESSAGE =
  "For your privacy and to help keep recruitment secure, some personal information has been protected automatically.";

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function decideProtectionStep(observation: PGPEProtectionObservation): PGPEProtectionDecision {
  if (observation.confidenceLevel === "low") {
    return {
      confidenceLevel: "low",
      protectionAction: "none",
      showFriendlyNotification: false,
      userMessage: null,
      notifyPolicyEngine: false,
      notifyRuleEngine: false,
      appendEvidenceReference: false,
      continueWorkflow: true,
      automaticPenalty: "none",
    };
  }

  if (observation.confidenceLevel === "medium") {
    return {
      confidenceLevel: "medium",
      protectionAction: observation.providerResult.protectionAction,
      showFriendlyNotification: false,
      userMessage: null,
      notifyPolicyEngine: false,
      notifyRuleEngine: false,
      appendEvidenceReference: false,
      continueWorkflow: true,
      automaticPenalty: "none",
    };
  }

  if (observation.confidenceLevel === "high") {
    return {
      confidenceLevel: "high",
      protectionAction: observation.providerResult.protectionAction,
      showFriendlyNotification: true,
      userMessage: PGPE_USER_FRIENDLY_MESSAGE,
      notifyPolicyEngine: false,
      notifyRuleEngine: false,
      appendEvidenceReference: false,
      continueWorkflow: true,
      automaticPenalty: "none",
    };
  }

  return {
    confidenceLevel: "very_high",
    protectionAction: observation.providerResult.protectionAction,
    showFriendlyNotification: true,
    userMessage: PGPE_USER_FRIENDLY_MESSAGE,
    notifyPolicyEngine: observation.repeatedConfirmedAttempts >= 3,
    notifyRuleEngine: observation.repeatedConfirmedAttempts >= 3,
    appendEvidenceReference: observation.repeatedConfirmedAttempts >= 3,
    continueWorkflow: true,
    automaticPenalty: "none",
  };
}

export function createPGPEProviderResult(input: Omit<PGPEProviderResult, "confidence"> & { confidence: number }): PGPEProviderResult {
  return {
    ...input,
    confidence: clampConfidence(input.confidence),
  };
}

function createPGPEProtectionResult(decision: PGPEProtectionDecision, providerResult: PGPEProviderResult): PGPEProtectionResult {
  return {
    detector: providerResult.detector,
    confidence: providerResult.confidence,
    reason: providerResult.reason,
    evidenceReference: providerResult.evidenceReference,
    suggestedAction: providerResult.suggestedAction,
    protectionAction: providerResult.protectionAction,
    humanReviewRequired: providerResult.humanReviewRequired,
    falsePositivePossible: providerResult.falsePositivePossible,
    confidenceLevel: decision.confidenceLevel,
    continueWorkflow: true,
    userMessage: decision.userMessage,
  };
}

export function createPGPEDocumentModelArchitecture(): PGPEDocumentModelArchitecture {
  return {
    originalCopy: {
      encrypted: true,
      owner: "prime_global",
      visibleToEmployer: false,
    },
    protectedCopy: {
      usedForRecruitment: true,
      visibleToEmployer: true,
      redactionApplied: true,
    },
    futureAIProfessionalProfile: {
      generatedLater: true,
      source: "protected_copy",
      aiNotImplemented: true,
    },
  };
}

export function runPGPEProtectionPipeline(observation: Omit<PGPEProtectionObservation, "providerResult"> & { providerResult: Omit<PGPEProviderResult, "protectionAction"> }): {
  steps: PGPEPipelineStep[];
  protectionResult: PGPEProtectionResult;
  protectionDecision: PGPEProtectionDecision;
  reviewStatusOptions: PGPEReviewStatus[];
  documentModelArchitecture: PGPEDocumentModelArchitecture;
  protectionEvents: ReturnType<typeof createPGPEProtectionEvents>;
  protectionAuditRecord: ReturnType<typeof createPGPEProtectionAuditRecord>;
  protectionTimelineEvent: ReturnType<typeof createPGPEProtectionTimelineEvent>;
} {
  const redactionEngine = createRedactionEngine();
  const providerResult = createPGPEProviderResult({
    ...observation.providerResult,
    protectionAction: redactionEngine.selectAction(observation.signalType),
  });

  const protectionDecision = decideProtectionStep({
    ...observation,
    providerResult,
  });
  const protectionResult = createPGPEProtectionResult(protectionDecision, providerResult);
  const documentModelArchitecture = createPGPEDocumentModelArchitecture();
  const sourceId = observation.providerResult.evidenceReference ?? "pgpe-source:unknown";

  return {
    steps: [
      "normalize",
      "inspect",
      "analyze",
      "confidence_scoring",
      "protection_decision",
      "automatic_protection",
      "evidence_reference",
      "continue_workflow",
    ],
    protectionResult,
    protectionDecision,
    reviewStatusOptions: ["confirmed", "false_positive", "ignored", "manually_reviewed"],
    documentModelArchitecture,
    protectionEvents: createPGPEProtectionEvents(sourceId, protectionResult),
    protectionAuditRecord: createPGPEProtectionAuditRecord(sourceId, protectionResult),
    protectionTimelineEvent: createPGPEProtectionTimelineEvent(sourceId),
  };
}
