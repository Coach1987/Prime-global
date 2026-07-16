import { createHash } from "node:crypto";
import type { OrchestrationState } from "../types/index.ts";

export interface OrchestrationSnapshot {
  orchestrationId: string;
  orchestrationState: OrchestrationState;
  graphVersion: string;
  currentNodeId: string;
  completedNodes: string[];
  pendingNodes: string[];
  failedNodes: string[];
  compensatedNodes: string[];
  orchestrationVersion: number;
  eventCursor: { sequence: number; eventId: string | null };
  retryState: { attempts: number; nextRetryAt: string | null };
  timeoutState: { timeoutAt: string | null; expired: boolean };
  scheduledActionState: { nextActionAt: string | null };
  humanInterventionState: { required: boolean; reason: string | null };
  integrityHash: string;
  createdAt: string;
}

export interface SnapshotVerificationResult {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
}

export interface SnapshotCasResult {
  ok: boolean;
  expectedVersion: number;
  actualVersion: number;
}

export interface OrchestrationSnapshotRepository {
  save(snapshot: Omit<OrchestrationSnapshot, "integrityHash" | "createdAt">): Promise<OrchestrationSnapshot>;
  load(orchestrationId: string): Promise<OrchestrationSnapshot | null>;
  loadHistory(orchestrationId: string): Promise<OrchestrationSnapshot[]>;
  compareAndSwap(orchestrationId: string, expectedVersion: number, next: Omit<OrchestrationSnapshot, "integrityHash" | "createdAt">): Promise<SnapshotCasResult>;
  verify(snapshot: OrchestrationSnapshot): SnapshotVerificationResult;
  migrateGraphVersion(orchestrationId: string, targetGraphVersion: string): Promise<OrchestrationSnapshot | null>;
}

function hashSnapshot(snapshot: Omit<OrchestrationSnapshot, "integrityHash">): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function createInMemoryOrchestrationSnapshotRepository(): OrchestrationSnapshotRepository {
  const current = new Map<string, OrchestrationSnapshot>();
  const history = new Map<string, OrchestrationSnapshot[]>();

  return {
    async save(snapshotInput) {
      const createdAt = new Date().toISOString();
      const snapshotWithoutHash = {
        ...snapshotInput,
        createdAt,
      };
      const snapshot: OrchestrationSnapshot = {
        ...snapshotWithoutHash,
        integrityHash: hashSnapshot(snapshotWithoutHash),
      };

      current.set(snapshot.orchestrationId, snapshot);
      const existing = history.get(snapshot.orchestrationId) ?? [];
      existing.push(snapshot);
      history.set(snapshot.orchestrationId, existing);
      return snapshot;
    },

    async load(orchestrationId) {
      return current.get(orchestrationId) ?? null;
    },

    async loadHistory(orchestrationId) {
      return (history.get(orchestrationId) ?? []).slice();
    },

    async compareAndSwap(orchestrationId, expectedVersion, next) {
      const existing = current.get(orchestrationId);
      const actualVersion = existing?.orchestrationVersion ?? 0;
      if (actualVersion !== expectedVersion) {
        return {
          ok: false,
          expectedVersion,
          actualVersion,
        };
      }

      await this.save(next);
      return {
        ok: true,
        expectedVersion,
        actualVersion,
      };
    },

    verify(snapshot) {
      const { integrityHash, ...payload } = snapshot;
      const expectedHash = hashSnapshot(payload);
      return {
        valid: integrityHash === expectedHash,
        expectedHash,
        actualHash: integrityHash,
      };
    },

    async migrateGraphVersion(orchestrationId, targetGraphVersion) {
      const existing = current.get(orchestrationId);
      if (!existing) return null;

      return this.save({
        ...existing,
        graphVersion: targetGraphVersion,
      });
    },
  };
}
