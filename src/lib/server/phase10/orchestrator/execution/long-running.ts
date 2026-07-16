import type { OrchestrationState } from "../types/index.ts";

export interface LongRunningOrchestrationState {
  orchestrationId: string;
  nextActionAt: string | null;
  timeoutAt: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  heartbeatAt: string | null;
  recoveryCursor: string | null;
  retryCount: number;
  lastSuccessfulNode: string | null;
  pendingExternalConfirmation: boolean;
  manualReviewHold: boolean;
  suspended: boolean;
}

export interface LongRunningStateStore {
  save(state: LongRunningOrchestrationState): Promise<void>;
  load(orchestrationId: string): Promise<LongRunningOrchestrationState | null>;
  listDue(now: Date): Promise<LongRunningOrchestrationState[]>;
  suspend(orchestrationId: string): Promise<boolean>;
  resume(orchestrationId: string): Promise<boolean>;
}

export function createInMemoryLongRunningStateStore(): LongRunningStateStore {
  const map = new Map<string, LongRunningOrchestrationState>();

  return {
    async save(state) {
      map.set(state.orchestrationId, state);
    },

    async load(orchestrationId) {
      return map.get(orchestrationId) ?? null;
    },

    async listDue(now) {
      return Array.from(map.values()).filter((entry) => {
        if (entry.suspended || entry.manualReviewHold) return false;
        if (!entry.nextActionAt) return false;
        return new Date(entry.nextActionAt).getTime() <= now.getTime();
      });
    },

    async suspend(orchestrationId) {
      const current = map.get(orchestrationId);
      if (!current) return false;
      current.suspended = true;
      return true;
    },

    async resume(orchestrationId) {
      const current = map.get(orchestrationId);
      if (!current) return false;
      current.suspended = false;
      return true;
    },
  };
}

export function toLongRunningState(orchestration: OrchestrationState): LongRunningOrchestrationState {
  return {
    orchestrationId: orchestration.identity.orchestrationId,
    nextActionAt: orchestration.timing.nextScheduledActionAt,
    timeoutAt: orchestration.timing.timeoutAt,
    leaseOwner: null,
    leaseExpiresAt: null,
    heartbeatAt: null,
    recoveryCursor: null,
    retryCount: 0,
    lastSuccessfulNode: orchestration.currentNodeId,
    pendingExternalConfirmation: false,
    manualReviewHold: orchestration.humanReviewRequired,
    suspended: false,
  };
}
