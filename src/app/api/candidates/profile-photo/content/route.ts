import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const AVATAR_BUCKET = "candidate-avatars";

function onboardingError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      code,
      message,
      error: { code, message },
    },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "candidate-profile-photo-content-get", 120);
    if (rateLimitResult) return rateLimitResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
    if (roleCheck) return roleCheck;

    const supabase = createSupabaseAdminClient();

    const { data: candidate, error: candidateError } = await supabase
      .from("candidate_profiles")
      .select("id")
      .eq("auth_user_id", auth.userId)
      .maybeSingle();

    if (candidateError || !candidate?.id) {
      return onboardingError(404, "CANDIDATE_NOT_FOUND", "Candidate profile missing");
    }

    const { data: professional, error: profileError } = await supabase
      .from("candidate_professional_profiles")
      .select("photo_storage_path")
      .eq("candidate_id", candidate.id)
      .maybeSingle();

    if (profileError) {
      return onboardingError(500, "PROFILE_PHOTO_LOAD_FAILED", "Unable to load profile photo.");
    }

    const storagePath = typeof professional?.photo_storage_path === "string" ? professional.photo_storage_path : null;
    if (!storagePath) {
      return onboardingError(404, "PROFILE_PHOTO_NOT_FOUND", "Profile photo not found.");
    }

    const { data: blob, error: downloadError } = await supabase.storage.from(AVATAR_BUCKET).download(storagePath);
    if (downloadError || !blob) {
      return onboardingError(404, "PROFILE_PHOTO_NOT_FOUND", "Profile photo not found.");
    }

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return onboardingError(500, "PROFILE_PHOTO_LOAD_FAILED", "Unable to load profile photo.");
  }
}
