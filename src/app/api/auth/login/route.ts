import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabasePublicClient } from "@/lib/server/supabase";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  role: z.enum(["candidate", "employer", "staff"]),
});

function resolveRole(raw: unknown): string {
  if (typeof raw !== "string") return "candidate";
  return raw;
}

function isStaffRole(role: string) {
  return role === "prime_global_recruiter" || role === "prime_global_admin" || role === "admin" || role === "super_admin";
}

function roleAllowed(requestedRole: "candidate" | "employer" | "staff", actualRole: string) {
  if (requestedRole === "staff") return isStaffRole(actualRole);
  return requestedRole === actualRole;
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "auth-login", 30);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, loginSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user || !data.session) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_LOGIN_FAILED",
          message: error?.message ?? "Invalid credentials",
        },
      },
      { status: 401 }
    );
  }

  const actualRole = resolveRole(data.user.app_metadata?.app_role ?? data.user.user_metadata?.app_role);
  if (!roleAllowed(parsed.data.role, actualRole)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_ROLE_MISMATCH",
          message: "Role mismatch for this login path.",
        },
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: actualRole,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    },
  });
}
