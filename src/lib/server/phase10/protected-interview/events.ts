import { createPhase10DomainEvent } from "../events/index.ts";
import type { Phase10DomainEvent } from "../events/index.ts";

export type InterviewLifecycleDomainEventType =
  | "InterviewReserved"
  | "InterviewActivated"
  | "ParticipantJoined"
  | "ParticipantLeft"
  | "InterviewStarted"
  | "InterviewCompleted"
  | "InterviewCancelled"
  | "InterviewExpired"
  | "InterviewRescheduled"
  | "RoomClosed"
  | "RoomExpired";

export function createInterviewLifecycleEvent(input: {
  eventType: InterviewLifecycleDomainEventType;
  interviewId: string;
  actorId: string;
  actorRole: string;
  organizationId: string;
  tenantId?: string | null;
  payload?: Record<string, unknown>;
}): Phase10DomainEvent {
  return createPhase10DomainEvent({
    eventType: input.eventType,
    actorId: input.actorId,
    actorRole: input.actorRole,
    organizationId: input.organizationId,
    tenantId: input.tenantId ?? null,
    interviewId: input.interviewId,
    decisionOrigin: "system_rule",
    payload: {
      interviewLifecycleEventType: input.eventType,
      ...(input.payload ?? {}),
    },
  });
}
