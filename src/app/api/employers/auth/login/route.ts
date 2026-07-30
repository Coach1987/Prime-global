import { NextResponse } from "next/server";
import { employerLoginSchema } from "@/features/employers/schemas/portal";
import { getEmployerByAuthUserId, normalizeEmployerAccountStatus } from "@/lib/server/employers";
import { createSupabasePublicClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { setAuthCookies } from "@/lib/server/security/session-cookies";

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-login", 30);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, employerLoginSchema);
  if (parsed.error) return parsed.error;

  const { ipAddress, userAgent } = getRequestContext(request);
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user || !data.session) {
    return NextResponse.json(
      { success: false, error: { code: "LOGIN_FAILED", message: error?.message ?? "Invalid credentials" } },
      { status: 401 }
    );
  }

  const role = String(data.user.app_metadata?.app_role ?? data.user.user_metadata?.app_role ?? "candidate");
  if (role !== "employer") {
    await supabase.auth.signOut();
    return NextResponse.json(
      { success: false, error: { code: "LOGIN_ROLE_DENIED", message: "Employer account required for this endpoint" } },
      { status: 403 }
    );
  }

  await createAuditLog({
    actorAuthUserId: data.user.id,
    actorRole: String(data.user.app_metadata?.app_role ?? "candidate"),
    action: "employer.login",
    targetType: "auth_session",
    targetId: data.session.access_token.slice(0, 24),
    ipAddress,
    userAgent,
  });

  const employer = await getEmployerByAuthUserId(data.user.id);
  const verificationStatus = (employer?.verification_status as string | null) ?? null;
  const accountStatus = normalizeEmployerAccountStatus(verificationStatus);

  const response = NextResponse.json({
    success: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
        verificationStatus,
        accountStatus,
      },
    },
  });

  setAuthCookies(response, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
  });

  return response;
}
