import { NextResponse } from "next/server";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { clearAuthCookies } from "@/lib/server/security/session-cookies";

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "auth-logout", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
