import type { Phase10DomainEvent } from "../../events/index.ts";
import type {
  WorkflowAuditEntry,
  WorkflowEvidenceReference,
  WorkflowState,
  WorkflowTimelineEvent,
  WorkflowTransitionRecord,
} from "../types/index.ts";

export interface OptimisticLockResult {
  ok: boolean;
  expectedVersion: number;
  actualVersion: number;
  explanation: string;
  retryGuidance: string;
  staffOverrideAllowed: boolean;
}

export interface WorkflowAtomicWrite {
  workflowId: string;
  state: WorkflowState;
  transition: WorkflowTransitionRecord;
  events: Phase10DomainEvent[];
  audit: WorkflowAuditEntry;
  evidence?: WorkflowEvidenceReference | null;
  timeline?: WorkflowTimelineEvent | null;
  idempotencyCompletion: {
    key: string;
    organizationId: string;
    tenantId: string | null;
    actorId: string;
    status: "completed" | "failed";
  };
}

export interface WorkflowRepository {
  getState(workflowId: string): Promise<WorkflowState | null>;
  compareAndSwapState(workflowId: string, expectedVersion: number, nextState: WorkflowState): Promise<OptimisticLockResult>;
  appendTransition(record: WorkflowTransitionRecord): Promise<void>;
  appendEvents(workflowId: string, events: Phase10DomainEvent[]): Promise<void>;
  appendAudit(entry: WorkflowAuditEntry): Promise<void>;
  appendEvidence(reference: WorkflowEvidenceReference): Promise<void>;
  appendTimeline(event: WorkflowTimelineEvent): Promise<void>;
  markIdempotencyCompletion(write: WorkflowAtomicWrite["idempotencyCompletion"]): Promise<void>;
}

export interface WorkflowUnitOfWork {
  runAtomic(operation: WorkflowAtomicWrite): Promise<void>;
}

export interface InMemoryWorkflowPersistenceSnapshot {
  states: Map<string, WorkflowState>;
  transitions: WorkflowTransitionRecord[];
  events: Array<{ workflowId: string; event: Phase10DomainEvent; sequence: number }>;
  audit: WorkflowAuditEntry[];
  evidence: WorkflowEvidenceReference[];
  timeline: WorkflowTimelineEvent[];
  idempotency: WorkflowAtomicWrite["idempotencyCompletion"][];
}

export function explainOptimisticConflict(expectedVersion: number, actualVersion: number): OptimisticLockResult {
  return {
    ok: expectedVersion === actualVersion,
    expectedVersion,
    actualVersion,
    explanation:
      expectedVersion === actualVersion
        ? "Expected version matches current version."
        : `Expected version ${expectedVersion} does not match current version ${actualVersion}.`,
    retryGuidance: "Reload workflow state and retry with the latest version.",
    staffOverrideAllowed: false,
  };
}

export function nextWorkflowVersion(currentVersion: number): number {
  return currentVersion + 1;
}

export function createInMemoryWorkflowRepository(options?: { failOnStep?: keyof WorkflowAtomicWrite | "none" }) {
  const snapshot: InMemoryWorkflowPersistenceSnapshot = {
    states: new Map<string, WorkflowState>(),
    transitions: [],
    events: [],
    audit: [],
    evidence: [],
    timeline: [],
    idempotency: [],
  };

  const counters = new Map<string, number>();

  const repository: WorkflowRepository = {
    async getState(workflowId) {
      return snapshot.states.get(workflowId) ?? null;
    },

    async compareAndSwapState(workflowId, expectedVersion, nextState) {
      const current = snapshot.states.get(workflowId);
      const actual = current?.version ?? 0;
      if (actual !== expectedVersion) {
        return explainOptimisticConflict(expectedVersion, actual);
      }
      snapshot.states.set(workflowId, nextState);
      return explainOptimisticConflict(expectedVersion, actual);
    },

    async appendTransition(record) {
      snapshot.transitions.push(record);
    },

    async appendEvents(workflowId, events) {
      const start = counters.get(workflowId) ?? 0;
      events.forEach((event, index) => {
        snapshot.events.push({ workflowId, event, sequence: start + index + 1 });
      });
      counters.set(workflowId, start + events.length);
    },

    async appendAudit(entry) {
      snapshot.audit.push(entry);
    },

    async appendEvidence(reference) {
      snapshot.evidence.push(reference);
    },

    async appendTimeline(event) {
      snapshot.timeline.push(event);
    },

    async markIdempotencyCompletion(write) {
      snapshot.idempotency.push(write);
    },
  };

  const unitOfWork: WorkflowUnitOfWork = {
    async runAtomic(operation) {
      const failOn = options?.failOnStep ?? "none";
      const stateBackup = new Map(snapshot.states);
      const transitionsBackup = snapshot.transitions.slice();
      const eventsBackup = snapshot.events.slice();
      const auditBackup = snapshot.audit.slice();
      const evidenceBackup = snapshot.evidence.slice();
      const timelineBackup = snapshot.timeline.slice();
      const idemBackup = snapshot.idempotency.slice();
      const counterBackup = new Map(counters);

      try {
        if (failOn === "state") throw new Error("persistence_failure_state");
        snapshot.states.set(operation.workflowId, operation.state);

        if (failOn === "transition") throw new Error("persistence_failure_transition");
        await repository.appendTransition(operation.transition);

        if (failOn === "events") throw new Error("persistence_failure_events");
        await repository.appendEvents(operation.workflowId, operation.events);

        if (failOn === "audit") throw new Error("persistence_failure_audit");
        await repository.appendAudit(operation.audit);

        if (operation.evidence) {
          if (failOn === "evidence") throw new Error("persistence_failure_evidence");
          await repository.appendEvidence(operation.evidence);
        }

        if (operation.timeline) {
          if (failOn === "timeline") throw new Error("persistence_failure_timeline");
          await repository.appendTimeline(operation.timeline);
        }

        if (failOn === "idempotencyCompletion") throw new Error("persistence_failure_idempotency_completion");
        await repository.markIdempotencyCompletion(operation.idempotencyCompletion);
      } catch (error) {
        snapshot.states = stateBackup;
        snapshot.transitions = transitionsBackup;
        snapshot.events = eventsBackup;
        snapshot.audit = auditBackup;
        snapshot.evidence = evidenceBackup;
        snapshot.timeline = timelineBackup;
        snapshot.idempotency = idemBackup;
        counters.clear();
        for (const [key, value] of counterBackup.entries()) counters.set(key, value);
        throw error;
      }
    },
  };

  return {
    repository,
    unitOfWork,
    snapshot,
  };
}
