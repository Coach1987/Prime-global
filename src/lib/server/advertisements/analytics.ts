import { createHash } from "crypto";

export function hashAnonymousSessionId(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function sanitizeAnalyticsLocale(value: string | null) {
  return value === "ar" ? "ar" : "en";
}
