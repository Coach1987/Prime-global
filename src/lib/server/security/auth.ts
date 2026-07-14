import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/server/supabase";

export type AppRole = "candidate" | "employer" | "admin" | "super_admin";

export interface AuthContext {
  userId: string;
  email: string;
  role: AppRole;
  accessToken: string;
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
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return unauthorizedResponse("Missing bearer token");
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return unauthorizedResponse("Invalid access token");
  }

  const role = normalizeRole(data.user.app_metadata?.app_role ?? data.user.user_metadata?.app_role);

  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    role,
    accessToken,
  };
}

export function requireRole(auth: AuthContext, allowedRoles: AppRole[]) {
  if (!allowedRoles.includes(auth.role)) {
    return forbiddenResponse("Insufficient role privileges");
  }
  return null;
}
