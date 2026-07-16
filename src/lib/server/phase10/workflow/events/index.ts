import type { Phase10DomainEvent } from "../../events/index.ts";

export interface WorkflowEventEnvelope {
  sequence: number;
  workflowId: string;
  workflowVersion: number;
  schemaVersion: number;
  correlationId: string;
  causationId: string | null;
  event: Phase10DomainEvent;
}

export interface ReplayStateHandler<TState> {
  eventType: string;
  apply: (state: TState, event: WorkflowEventEnvelope) => TState;
}

export interface SideEffectHandler {
  eventType: string;
  handle: (event: WorkflowEventEnvelope) => Promise<void>;
}

export interface DeadLetterRecord {
  workflowId: string;
  sequence: number;
  eventType: string;
  reason: string;
  timestamp: string;
}

export interface DeadLetterQueue {
  push(record: DeadLetterRecord): Promise<void>;
  list(): Promise<DeadLetterRecord[]>;
}

export function createInMemoryDeadLetterQueue(): DeadLetterQueue {
  const records: DeadLetterRecord[] = [];
  return {
    async push(record) {
      records.push(record);
    },
    async list() {
      return records.slice();
    },
  };
}

export function orderWorkflowEvents(events: WorkflowEventEnvelope[]): WorkflowEventEnvelope[] {
  return events.slice().sort((a, b) => a.sequence - b.sequence || a.workflowVersion - b.workflowVersion);
}

export function replayWorkflowState<TState>(
  initialState: TState,
  events: WorkflowEventEnvelope[],
  handlers: ReplayStateHandler<TState>[]
): TState {
  const ordered = orderWorkflowEvents(events);
  const byType = new Map(handlers.map((handler) => [handler.eventType, handler]));

  return ordered.reduce((state, event) => {
    const handler = byType.get(event.event.eventType);
    if (!handler) return state;
    return handler.apply(state, event);
  }, initialState);
}

export async function runSideEffects(
  events: WorkflowEventEnvelope[],
  handlers: SideEffectHandler[],
  deadLetterQueue: DeadLetterQueue
): Promise<void> {
  const ordered = orderWorkflowEvents(events);
  const byType = new Map(handlers.map((handler) => [handler.eventType, handler]));

  for (const event of ordered) {
    const handler = byType.get(event.event.eventType);
    if (!handler) continue;

    try {
      await handler.handle(event);
    } catch (error) {
      await deadLetterQueue.push({
        workflowId: event.workflowId,
        sequence: event.sequence,
        eventType: event.event.eventType,
        reason: error instanceof Error ? error.message : "unknown_event_handler_failure",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
