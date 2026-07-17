import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/server/supabase";
import { readAuthCookies } from "@/lib/server/security/session-cookies";

export type AppRole =
  | "candidate"
  | "employer"
  | "prime_global_recruiter"
  | "prime_global_admin"
  | "admin"
  | "super_admin";

export interface AuthContext {
  userId: string;
  email: string;
  role: AppRole;
  accessToken: string;
  refreshedSession?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number | null;
  };
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim();
}

function normalizeRole(value: unknown): AppRole {
  if (value === "prime_global_admin") return "prime_global_admin";
  if (value === "prime_global_recruiter") return "prime_global_recruiter";
  if (value === "super_admin") return "super_admin";
  if (value === "admin") return "admin";
  if (value === "employer") return "employer";
  return "candidate";
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message } }, { status: 403 });
}

export async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const bearerToken = readBearerToken(request);
  const cookies = readAuthCookies(request);
  const accessToken = bearerToken || cookies.accessToken;
  if (!accessToken) return unauthorizedResponse("Missing session token");

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (!error && data.user) {
    const role = normalizeRole(data.user.app_metadata?.app_role ?? data.user.user_metadata?.app_role);

    return {
      userId: data.user.id,
      email: data.user.email ?? "",
      role,
      accessToken,
    };
  }

  if (!cookies.refreshToken) {
    return unauthorizedResponse("Invalid access token");
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
    refresh_token: cookies.refreshToken,
  });

  if (refreshError || !refreshed.session || !refreshed.user) {
    return unauthorizedResponse("Session expired");
  }

  const role = normalizeRole(refreshed.user.app_metadata?.app_role ?? refreshed.user.user_metadata?.app_role);

  return {
    userId: refreshed.user.id,
    email: refreshed.user.email ?? "",
    role,
    accessToken: refreshed.session.access_token,
    refreshedSession: {
      accessToken: refreshed.session.access_token,
      refreshToken: refreshed.session.refresh_token,
      expiresAt: refreshed.session.expires_at ?? null,
    },
  };
}

export function requireRole(auth: AuthContext, allowedRoles: AppRole[]) {
  if (!allowedRoles.includes(auth.role)) {
    return forbiddenResponse("Insufficient role privileges");
  }
  return null;
}
