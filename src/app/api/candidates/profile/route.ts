import { NextResponse } from "next/server";
import { candidateProfileSchema } from "@/features/candidates/schemas/candidate";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

function onboardingError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>
) {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      code,
      message,
      fieldErrors,
      error: { code, message },
    },
    { status }
  );
}

function normalizeProfileFieldErrors(input: Record<string, string[] | undefined>) {
  const next: Record<string, string> = {};
  if (input.city?.[0]) next.city = input.city[0];
  if (input.country?.[0]) next.countryCode = input.country[0];
  if (input.phoneNumber?.[0]) next.phoneE164 = input.phoneNumber[0];
  if (input.professionalTitle?.[0]) next.desiredPosition = input.professionalTitle[0];
  if (input.bio?.[0]) next.shortBio = input.bio[0];
  return next;
}

export async function GET(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "candidate-profile-get", 120);
    if (rateLimitResult) return rateLimitResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
    if (roleCheck) return roleCheck;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("auth_user_id", auth.userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "CANDIDATE_PROFILE_LOAD_FAILED", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CANDIDATE_PROFILE_LOAD_FAILED",
          message: error instanceof Error ? error.message : "Unable to load candidate profile.",
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "candidate-profile-put", 60);
    if (rateLimitResult) return rateLimitResult;

    const csrfResult = enforceCsrf(request);
    if (csrfResult) return csrfResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
    if (roleCheck) return roleCheck;

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return onboardingError(400, "INVALID_JSON", "Malformed JSON request body");
    }
    const parsed = candidateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      return onboardingError(
        400,
        "VALIDATION_ERROR",
        "Please correct the highlighted fields.",
        normalizeProfileFieldErrors(parsed.error.flatten().fieldErrors)
      );
    }

    const supabase = createSupabaseAdminClient();
    const input = parsed.data;

    const { data, error } = await supabase
      .from("candidate_profiles")
      .upsert(
        {
          auth_user_id: auth.userId,
          full_name: input.fullName,
          email: input.email,
          phone_number: input.phoneNumber || null,
          country: input.country || null,
          city: input.city || null,
          professional_title: input.professionalTitle || null,
          bio: input.bio || null,
        },
        { onConflict: "auth_user_id" }
      )
      .select("*")
      .single();

    if (error) {
      return onboardingError(400, "CANDIDATE_PROFILE_SAVE_FAILED", "Unable to save candidate profile.");
    }

    const { ipAddress, userAgent } = getRequestContext(request);
    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "candidate.profile.upsert",
      targetType: "candidate_profile",
      targetId: data.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ ok: true, success: true, data });
  } catch (error) {
    console.error("[candidate:profile] save failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        success: false,
        code: "CANDIDATE_PROFILE_SAVE_FAILED",
        message: "Unable to save candidate profile.",
        error: {
          code: "CANDIDATE_PROFILE_SAVE_FAILED",
          message: "Unable to save candidate profile.",
        },
      },
      { status: 500 }
    );
  }
}
