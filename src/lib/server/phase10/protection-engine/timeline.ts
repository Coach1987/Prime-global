import type { PGPEProtectionTimelineEvent } from "./types.ts";

export const PGPE_TIMELINE_USER_MESSAGE =
  "We protected private details in your submission to keep your recruitment process safe.";

export function createPGPEProtectionTimelineEvent(sourceId: string): PGPEProtectionTimelineEvent {
  return {
    sourceId,
    timelineCode: "privacy_protection_applied",
    userMessage: PGPE_TIMELINE_USER_MESSAGE,
    createdAt: new Date().toISOString(),
  };
}