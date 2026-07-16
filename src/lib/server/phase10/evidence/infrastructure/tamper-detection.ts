import type {
  Phase10EvidenceChainVerificationResult,
} from "../types.ts";
import type {
  Phase10TamperDetectionResult,
  Phase10TamperDetectionSignal,
  Phase10TamperSeverity,
} from "./types.ts";

const SEVERITY_ORDER: Record<Phase10TamperSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function maxSeverity(values: Phase10TamperSeverity[]): Phase10TamperSeverity {
  if (values.length === 0) {
    return "low";
  }

  return values.reduce((best, current) => {
    if (SEVERITY_ORDER[current] > SEVERITY_ORDER[best]) {
      return current;
    }
    return best;
  }, "low" as Phase10TamperSeverity);
}

export function buildTamperSignalsFromChainVerification(
  verification: Phase10EvidenceChainVerificationResult
): Phase10TamperDetectionSignal[] {
  if (verification.mismatches.length === 0) {
    return [];
  }

  return verification.mismatches.map((entry) => {
    const lowerIssue = entry.issue.toLowerCase();

    if (lowerIssue.includes("previous hash")) {
      return {
        eventId: entry.eventId,
        evidenceCaseId: verification.evidenceCaseId,
        signalType: "broken_chain",
        severity: "critical",
        message: entry.issue,
      } satisfies Phase10TamperDetectionSignal;
    }

    if (lowerIssue.includes("hash")) {
      return {
        eventId: entry.eventId,
        evidenceCaseId: verification.evidenceCaseId,
        signalType: "hash_mismatch",
        severity: "high",
        message: entry.issue,
      } satisfies Phase10TamperDetectionSignal;
    }

    return {
      eventId: entry.eventId,
      evidenceCaseId: verification.evidenceCaseId,
      signalType: "unknown",
      severity: "medium",
      message: entry.issue,
    } satisfies Phase10TamperDetectionSignal;
  });
}

export function createTamperDetectionResult(
  evidenceCaseId: string,
  signals: Phase10TamperDetectionSignal[]
): Phase10TamperDetectionResult {
  const highestSeverity = maxSeverity(signals.map((entry) => entry.severity));

  return {
    evidenceCaseId,
    hasTampering: signals.length > 0,
    highestSeverity,
    signals,
  };
}
