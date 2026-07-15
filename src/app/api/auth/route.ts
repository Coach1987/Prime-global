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

  const publicClient = createSupabasePublicClient();
  const adminClient = createSupabaseAdminClient();

  const { data: signUpData, error: signUpError } = await publicClient.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        app_role: "candidate",
        full_name: payload.fullName,
      },
    },
  });

  if (signUpError || !signUpData.user?.id) {
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

  const userId = signUpData.user.id;

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

  return NextResponse.json(
    {
      success: true,
      data: {
        userId,
        email: signUpData.user.email,
      },
    },
    { status: 201 }
  );
}
