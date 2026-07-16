export type AnalysisEventType =
  | "DocumentQuarantined"
  | "DocumentTypeClassified"
  | "DocumentAnalysisStarted"
  | "DocumentAnalysisCompleted"
  | "ProtectionFindingCreated"
  | "ProtectionPlanCreated"
  | "ProtectedCopyReady"
  | "DocumentReviewRequired"
  | "DocumentAnalysisFailedSafe"
  | "DocumentQuarantineExpired";

export interface AnalysisEvent {
  eventType: AnalysisEventType;
  analysisId: string;
  quarantineId: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export function createAnalysisEvent(input: {
  eventType: AnalysisEventType;
  analysisId: string;
  quarantineId: string;
  metadata?: Record<string, unknown>;
}): AnalysisEvent {
  return {
    eventType: input.eventType,
    analysisId: input.analysisId,
    quarantineId: input.quarantineId,
    occurredAt: new Date().toISOString(),
    metadata: input.metadata ?? {},
  };
}
