export interface OrchestrationEventEnvelope {
  orchestrationId: string;
  orchestrationSequence: number;
  workflowSequence: number;
  correlationId: string;
  causationId: string | null;
  schemaVersion: number;
  graphVersion: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface EventOrderingResult {
  ordered: boolean;
  duplicate: boolean;
  outOfOrder: boolean;
  reason: string;
}

export interface OrchestrationEventConsumer {
  consume(event: OrchestrationEventEnvelope): Promise<EventOrderingResult>;
  list(): Promise<OrchestrationEventEnvelope[]>;
}

export function createOrchestrationEventConsumer(): OrchestrationEventConsumer {
  const seen = new Set<string>();
  const events: OrchestrationEventEnvelope[] = [];

  return {
    async consume(event) {
      if (seen.has(event.eventId)) {
        return {
          ordered: true,
          duplicate: true,
          outOfOrder: false,
          reason: "duplicate_event",
        };
      }

      const last = events.filter((entry) => entry.orchestrationId === event.orchestrationId).at(-1);
      if (last && event.orchestrationSequence <= last.orchestrationSequence) {
        return {
          ordered: false,
          duplicate: false,
          outOfOrder: true,
          reason: "out_of_order_event",
        };
      }

      seen.add(event.eventId);
      events.push(event);
      return {
        ordered: true,
        duplicate: false,
        outOfOrder: false,
        reason: "accepted",
      };
    },

    async list() {
      return events.slice().sort((a, b) => a.orchestrationSequence - b.orchestrationSequence);
    },
  };
}

export function projectReplayState<TState>(initial: TState, events: OrchestrationEventEnvelope[], reduce: (state: TState, event: OrchestrationEventEnvelope) => TState): TState {
  return events
    .slice()
    .sort((a, b) => a.orchestrationSequence - b.orchestrationSequence || a.workflowSequence - b.workflowSequence)
    .reduce((state, event) => reduce(state, event), initial);
}
