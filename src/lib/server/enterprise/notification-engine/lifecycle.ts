import type { NotificationStatus, NotificationTransitionResult } from "./types.ts";

const TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  created: ["queued", "cancelled", "deleted", "archived", "unread"],
  queued: ["processing", "cancelled", "failed", "deleted", "archived"],
  processing: ["sent", "delivered", "failed", "cancelled", "deleted"],
  sent: ["delivered", "failed", "read", "unread", "archived", "deleted"],
  delivered: ["read", "unread", "archived", "deleted"],
  failed: ["queued", "processing", "cancelled", "deleted", "archived"],
  cancelled: ["archived", "deleted"],
  read: ["unread", "archived", "deleted"],
  unread: ["read", "archived", "deleted"],
  archived: ["unread", "read", "deleted"],
  deleted: [],
};

export function canTransitionNotificationStatus(from: NotificationStatus, to: NotificationStatus): NotificationTransitionResult {
  const allowed = TRANSITIONS[from].includes(to);
  return {
    allowed,
    from,
    to,
    reason: allowed ? `Transition ${from} -> ${to} allowed` : `Transition ${from} -> ${to} is not permitted`,
  };
}
