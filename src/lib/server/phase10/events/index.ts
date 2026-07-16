import { randomUUID } from "node:crypto";
import type { Phase10DomainEvent, Phase10DomainEventHandler, Phase10DomainEventType } from "./types.ts";

function createEventId() {
  return `phase10_${randomUUID()}`;
}

export function createPhase10DomainEvent(event: Omit<Phase10DomainEvent, "eventId" | "occurredAt">): Phase10DomainEvent {
  return {
    ...event,
    eventId: createEventId(),
    occurredAt: new Date().toISOString(),
  };
}

export function createPhase10DomainEventBus() {
  const handlers = new Map<Phase10DomainEventType | "*", Set<Phase10DomainEventHandler>>();

  function register(eventType: Phase10DomainEventType | "*", handler: Phase10DomainEventHandler) {
    const handlerSet = handlers.get(eventType) ?? new Set<Phase10DomainEventHandler>();
    handlerSet.add(handler);
    handlers.set(eventType, handlerSet);

    return () => {
      handlerSet.delete(handler);
    };
  }

  async function publish(event: Phase10DomainEvent) {
    const scopedHandlers = [
      ...(handlers.get(event.eventType) ?? []),
      ...(handlers.get("*") ?? []),
    ];

    for (const handler of scopedHandlers) {
      await handler(event);
    }

    return event;
  }

  return {
    register,
    publish,
  };
}

export type { Phase10DomainEvent, Phase10DomainEventHandler, Phase10DomainEventType } from "./types.ts";
