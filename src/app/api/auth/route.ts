import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";

const candidateRegistrationSchema = z
  .object({
    email: z.string().trim().email().max(320),
    password: z.string().min(8).max(128),
    fullName: z.string().trim().min(2).max(120),
    phoneNumber: z.string().trim().min(6).max(32).optional().or(z.literal("")),
    country: z.string().trim().min(2).max(120).optional().or(z.literal("")),
    city: z.string().trim().min(2).max(120).optional().or(z.literal("")),
    acceptTerms: z.literal(true),
  })
  .strict();

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-register", 20);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, candidateRegistrationSchema);
  if (parsed.error) return parsed.error;

  const payload = parsed.data;
  const { ipAddress, userAgent } = getRequestContext(request);

  const adminClient = createSupabaseAdminClient();
  const publicClient = createSupabasePublicClient();

  const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    app_metadata: {
      app_role: "candidate",
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
    },
    user_metadata: {
      app_role: "candidate",
      full_name: payload.fullName,
      registration_country: payload.country || null,
      recruitment_coordination_accepted: true,
    },
  });

  if (userError || !userData.user?.id) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CANDIDATE_REGISTER_FAILED",
          message: userError?.message ?? "Unable to create account with provided details.",
        },
      },
      { status: 400 }
    );
  }

  const userId = userData.user.id;

  const { error: profileError } = await adminClient.from("candidate_profiles").insert({
    auth_user_id: userId,
    full_name: payload.fullName,
    email: payload.email,
    phone_number: payload.phoneNumber || null,
    country: payload.country || null,
    city: payload.city || null,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CANDIDATE_REGISTER_FAILED",
          message: "Unable to create account with provided details.",
        },
      },
      { status: 400 }
    );
  }

  await createAuditLog({
    actorAuthUserId: userId,
    actorRole: "candidate",
    action: "candidate.register",
    targetType: "candidate_profile",
    targetId: userId,
    metadata: {
      emailDomain: payload.email.split("@")[1] ?? "unknown",
    },
    ipAddress,
    userAgent,
  });

  const { data: sessionData, error: sessionError } = await publicClient.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (sessionError || !sessionData.session) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CANDIDATE_REGISTER_SESSION_FAILED",
          message: "Account created but automatic sign-in failed.",
        },
      },
      { status: 201 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        userId,
        email: userData.user.email,
        session: {
          accessToken: sessionData.session.access_token,
          refreshToken: sessionData.session.refresh_token,
          expiresAt: sessionData.session.expires_at,
        },
      },
    },
    { status: 201 }
  );
}
