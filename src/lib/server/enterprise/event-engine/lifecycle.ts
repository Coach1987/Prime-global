import type { EventLifecycleTransitionResult, EventStatus } from "./types.ts";

const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  created: ["queued", "cancelled", "archived"],
  queued: ["processing", "cancelled", "failed", "archived"],
  processing: ["delivered", "failed", "cancelled", "retried"],
  delivered: ["archived"],
  failed: ["retried", "archived", "cancelled"],
  cancelled: ["archived"],
  retried: ["queued", "processing", "failed", "archived"],
  archived: [],
};

export function canTransitionEventStatus(from: EventStatus, to: EventStatus): EventLifecycleTransitionResult {
  const allowed = TRANSITIONS[from].includes(to);
  return {
    allowed,
    from,
    to,
    reason: allowed ? `Transition ${from} -> ${to} allowed` : `Transition ${from} -> ${to} is not permitted`,
  };
}
