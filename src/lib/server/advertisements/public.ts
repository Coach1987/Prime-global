import type { AdvertisementRecord } from "../../../features/advertisements/types";

export function isAdvertisementPubliclyVisible(
  advertisement: Pick<AdvertisementRecord, "status" | "moderation_status" | "starts_at" | "ends_at">,
  now = new Date()
) {
  if (advertisement.status !== "active") {
    return false;
  }

  if (advertisement.moderation_status !== "passed") {
    return false;
  }

  if (advertisement.starts_at) {
    const startsAt = new Date(advertisement.starts_at);
    if (startsAt.getTime() > now.getTime()) {
      return false;
    }
  }

  if (advertisement.ends_at) {
    const endsAt = new Date(advertisement.ends_at);
    if (endsAt.getTime() <= now.getTime()) {
      return false;
    }
  }

  return true;
}

export function sortAdvertisementsForPublic<T extends Pick<AdvertisementRecord, "priority" | "created_at">>(items: T[]) {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
