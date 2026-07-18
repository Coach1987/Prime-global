import type { NotificationPreferenceRecord } from "./types.ts";

export function isPreferenceMuted(preference: NotificationPreferenceRecord | null, nowIso = new Date().toISOString()) {
  if (!preference) return false;
  if (!preference.enabled) return true;
  if (!preference.mute_until) return false;
  return new Date(preference.mute_until).getTime() > new Date(nowIso).getTime();
}

export function resolvePreferredLocale(preference: NotificationPreferenceRecord | null, fallbackLocale: string) {
  return preference?.locale?.trim() ? preference.locale : fallbackLocale;
}
