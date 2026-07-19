import { NextResponse } from "next/server";
import { candidateProfileSchema } from "@/features/candidates/schemas/candidate";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
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
}

export async function PUT(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-profile-put", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, candidateProfileSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const payload = parsed.data;

  const { data, error } = await supabase
    .from("candidate_profiles")
    .upsert(
      {
        auth_user_id: auth.userId,
        full_name: payload.fullName,
        email: payload.email,
        phone_number: payload.phoneNumber || null,
        country: payload.country || null,
        city: payload.city || null,
        professional_title: payload.professionalTitle || null,
        bio: payload.bio || null,
      },
      { onConflict: "auth_user_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILE_SAVE_FAILED", message: error.message } },
      { status: 400 }
    );
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

  return NextResponse.json({ success: true, data });
}
