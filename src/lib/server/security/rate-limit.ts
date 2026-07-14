const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 60;

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export function checkRateLimit(key: string, config?: { windowMs?: number; maxRequests?: number }) {
  const windowMs = config?.windowMs ?? readPositiveInt(process.env.APP_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const maxRequests =
    config?.maxRequests ?? readPositiveInt(process.env.APP_RATE_LIMIT_MAX_REQUESTS, DEFAULT_MAX_REQUESTS);

  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.expiresAt <= now) {
    rateLimitStore.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAtMs: now + windowMs };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAtMs: existing.expiresAt };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(maxRequests - existing.count, 0),
    resetAtMs: existing.expiresAt,
  };
}
