import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/security/auth";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "auth-me", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    success: true,
    data: {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    },
  });
}
