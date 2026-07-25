import { canTransitionEventStatus } from "./lifecycle.ts";
import type {
  EventBusPublishResult,
  EventBusSubscribeResult,
  EventBusUnsubscribeResult,
  EventDuplicateCheck,
  EventReplayResult,
  EventRetryResult,
  EventStatus,
} from "./types.ts";

export function checkEventDuplicate(params: {
  existingEventIdempotencyKey: string | null;
  incomingIdempotencyKey: string;
}): EventDuplicateCheck {
  const duplicate = params.existingEventIdempotencyKey !== null && params.existingEventIdempotencyKey === params.incomingIdempotencyKey;
  return {
    duplicate,
    reason: duplicate ? "idempotency_key_already_seen" : "idempotency_key_new",
  };
}

export function createPublishResult(params: {
  eventId: string;
  deduplicated: boolean;
  status: EventStatus;
}): EventBusPublishResult {
  return {
    accepted: true,
    eventId: params.eventId,
    status: params.status,
    deduplicated: params.deduplicated,
    reason: params.deduplicated ? "accepted_as_duplicate_reference" : "accepted_for_processing",
  };
}

export function createSubscribeResult(subscriptionId: string): EventBusSubscribeResult {
  return {
    subscriptionId,
    active: true,
  };
}

export function createUnsubscribeResult(subscriptionId: string, reason: string): EventBusUnsubscribeResult {
  return {
    subscriptionId,
    active: false,
    reason,
  };
}

export function createRetryResult(params: { eventId: string; retryCount: number; nextRetryAt: string }): EventRetryResult {
  return {
    eventId: params.eventId,
    retryCount: params.retryCount,
    status: "retried",
    nextRetryAt: params.nextRetryAt,
  };
}

export function createReplayResult(params: { sourceEventId: string; replayedEventId: string }): EventReplayResult {
  return {
    sourceEventId: params.sourceEventId,
    replayedEventId: params.replayedEventId,
    status: "queued",
  };
}

export function validateEventStatusTransition(from: EventStatus, to: EventStatus) {
  return canTransitionEventStatus(from, to);
}
