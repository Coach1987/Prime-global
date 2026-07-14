import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { checkRateLimit } from "@/lib/server/security/rate-limit";
import { verifyCsrf } from "@/lib/server/security/csrf";

function getIpAddress(request: Request) {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function getRequestContext(request: Request) {
  return {
    ipAddress: getIpAddress(request),
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };
}

export function enforceRateLimit(request: Request, keySeed: string, maxRequests = 60) {
  const ip = getIpAddress(request);
  const limiter = checkRateLimit(`${keySeed}:${ip}`, { maxRequests });

  if (!limiter.allowed) {
    return NextResponse.json(
      { success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } },
      {
        status: 429,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(limiter.resetAtMs),
        },
      }
    );
  }

  return null;
}

export function enforceCsrf(request: Request) {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { success: false, error: { code: "CSRF_INVALID", message: "Invalid CSRF token" } },
      { status: 403 }
    );
  }

  return null;
}

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { success: false, error: { code: "INVALID_JSON", message: "Malformed JSON request body" } },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid request payload" },
          details: parsed.error.flatten(),
        },
        { status: 400 }
      ),
    };
  }

  return { data: parsed.data, error: null };
}
