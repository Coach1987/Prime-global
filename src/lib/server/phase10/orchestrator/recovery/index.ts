import type { OrchestrationState } from "../types/index.ts";
import type { OrchestrationSnapshotRepository } from "../snapshots/index.ts";

export interface OrchestrationRecoveryRecord {
  orchestrationId: string;
  state: "healthy" | "recovery_required" | "recovering" | "recovered" | "recovery_failed" | "manual_review_required" | "compromised";
  reason: string;
  recoveredAt: string;
  evidenceReferenceId: string | null;
  auditReferenceId: string | null;
}

export interface OrchestrationRecoveryService {
  findIncomplete(states: OrchestrationState[]): OrchestrationState[];
  recover(orchestrationId: string): Promise<OrchestrationRecoveryRecord>;
  history(): Promise<OrchestrationRecoveryRecord[]>;
}

export function createOrchestrationRecoveryService(input: {
  snapshots: OrchestrationSnapshotRepository;
  readCurrentStates: () => Promise<OrchestrationState[]>;
}): OrchestrationRecoveryService {
  const records: OrchestrationRecoveryRecord[] = [];

  return {
    findIncomplete(states) {
      return states.filter((entry) => ["pending", "running", "waiting", "retry_scheduled", "compensating"].includes(entry.status));
    },

    async recover(orchestrationId) {
      const snapshot = await input.snapshots.load(orchestrationId);
      if (!snapshot) {
        const failed: OrchestrationRecoveryRecord = {
          orchestrationId,
          state: "recovery_failed",
          reason: "orchestration snapshot not found",
          recoveredAt: new Date().toISOString(),
          evidenceReferenceId: null,
          auditReferenceId: null,
        };
        records.push(failed);
        return failed;
      }

      const verification = input.snapshots.verify(snapshot);
      if (!verification.valid) {
        const compromised: OrchestrationRecoveryRecord = {
          orchestrationId,
          state: "compromised",
          reason: "snapshot integrity verification failed",
          recoveredAt: new Date().toISOString(),
          evidenceReferenceId: `recovery-evidence:${orchestrationId}`,
          auditReferenceId: `recovery-audit:${orchestrationId}`,
        };
        records.push(compromised);
        return compromised;
      }

      const recovered: OrchestrationRecoveryRecord = {
        orchestrationId,
        state: "recovered",
        reason: "restored from latest valid snapshot",
        recoveredAt: new Date().toISOString(),
        evidenceReferenceId: `recovery-evidence:${orchestrationId}`,
        auditReferenceId: `recovery-audit:${orchestrationId}`,
      };
      records.push(recovered);
      return recovered;
    },

    async history() {
      return records.slice();
    },
  };
}
