import type { OrchestrationState } from "../types/index.ts";
import type { OrchestrationSnapshot } from "../snapshots/index.ts";

export interface OrchestrationUnitOfWorkInput {
  orchestrationState: OrchestrationState;
  workflowCommandResult: Record<string, unknown>;
  workflowStateUpdate: Record<string, unknown>;
  sagaStepUpdate: Record<string, unknown>;
  snapshotAppend: OrchestrationSnapshot;
  domainEvents: Array<{ eventType: string; payload: Record<string, unknown> }>;
  auditReference: string;
  evidenceReference: string;
  timelineEvent: { eventType: string; description: string; timestamp: string };
  scheduledAction: { actionId: string; scheduledAt: string } | null;
  idempotencyCompletion: { key: string; status: "completed" | "failed" };
  retryState: { attempts: number; nextRetryAt: string | null };
  compensationState: { status: string; steps: string[] };
}

export interface OrchestrationUnitOfWork {
  runAtomic(input: OrchestrationUnitOfWorkInput): Promise<void>;
  readState(orchestrationId: string): Promise<OrchestrationState | null>;
  getEvents(orchestrationId: string): Promise<Array<{ sequence: number; eventType: string }>>;
}

export function createInMemoryOrchestrationUnitOfWork(options?: { failStep?: keyof OrchestrationUnitOfWorkInput | "none" }): OrchestrationUnitOfWork {
  const stateStore = new Map<string, OrchestrationState>();
  const snapshots = new Map<string, OrchestrationSnapshot[]>();
  const events = new Map<string, Array<{ sequence: number; eventType: string }>>();

  return {
    async runAtomic(input) {
      const failStep = options?.failStep ?? "none";
      const stateBackup = new Map(stateStore);
      const snapshotsBackup = new Map(Array.from(snapshots.entries()).map(([k, v]) => [k, v.slice()]));
      const eventsBackup = new Map(Array.from(events.entries()).map(([k, v]) => [k, v.slice()]));

      try {
        if (failStep === "orchestrationState") throw new Error("uow_fail_orchestration_state");
        stateStore.set(input.orchestrationState.identity.orchestrationId, input.orchestrationState);

        if (failStep === "snapshotAppend") throw new Error("uow_fail_snapshot");
        const existingSnapshots = snapshots.get(input.orchestrationState.identity.orchestrationId) ?? [];
        existingSnapshots.push(input.snapshotAppend);
        snapshots.set(input.orchestrationState.identity.orchestrationId, existingSnapshots);

        if (failStep === "domainEvents") throw new Error("uow_fail_events");
        const existingEvents = events.get(input.orchestrationState.identity.orchestrationId) ?? [];
        input.domainEvents.forEach((event, index) => {
          existingEvents.push({ sequence: existingEvents.length + index + 1, eventType: event.eventType });
        });
        events.set(input.orchestrationState.identity.orchestrationId, existingEvents);

        if (failStep !== "none") {
          throw new Error(`uow_fail_${String(failStep)}`);
        }
      } catch (error) {
        stateStore.clear();
        for (const [k, v] of stateBackup.entries()) stateStore.set(k, v);

        snapshots.clear();
        for (const [k, v] of snapshotsBackup.entries()) snapshots.set(k, v);

        events.clear();
        for (const [k, v] of eventsBackup.entries()) events.set(k, v);

        throw error;
      }
    },

    async readState(orchestrationId) {
      return stateStore.get(orchestrationId) ?? null;
    },

    async getEvents(orchestrationId) {
      return (events.get(orchestrationId) ?? []).slice();
    },
  };
}
