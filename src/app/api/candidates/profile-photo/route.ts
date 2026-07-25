import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { createAuditLog } from "@/lib/server/security/audit";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const AVATAR_BUCKET = "candidate-avatars";
const MAX_PHOTO_SIZE_BYTES = 3 * 1024 * 1024;

const visibilitySchema = z.object({
  visibility: z.enum(["private", "employer_profile"]),
});

type PhotoVisibility = "private" | "employer_profile";

type CandidateContext = {
  candidateId: string;
  currentPath: string | null;
};

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

function detectRealImageMime(buffer: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (buffer.length >= 8) {
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (pngSig.every((value, index) => buffer[index] === value)) return "image/png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function extFromMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function deriveVisibilityFromPath(pathValue: string | null | undefined): PhotoVisibility {
  if (!pathValue) return "private";
  if (pathValue.includes("/employer-profile/")) return "employer_profile";
  return "private";
}

function buildStoragePath(authUserId: string, candidateId: string, visibility: PhotoVisibility, extension: string) {
  const visibilityFolder = visibility === "employer_profile" ? "employer-profile" : "private";
  return `${authUserId}/${candidateId}/${visibilityFolder}/profile-photo-${Date.now()}-${randomUUID()}.${extension}`;
}

async function loadCandidateContext(authUserId: string): Promise<CandidateContext | null> {
  const supabase = createSupabaseAdminClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (candidateError || !candidate?.id) return null;

  const candidateId = String(candidate.id);

  const { data: professional } = await supabase
    .from("candidate_professional_profiles")
    .select("photo_storage_path")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  return {
    candidateId,
    currentPath: typeof professional?.photo_storage_path === "string" ? professional.photo_storage_path : null,
  };
}

async function upsertPhotoPath(candidateId: string, nextPath: string | null) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("candidate_professional_profiles").upsert(
    {
      candidate_id: candidateId,
      photo_storage_path: nextPath,
    },
    { onConflict: "candidate_id" }
  );

  return error;
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-profile-photo-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const context = await loadCandidateContext(auth.userId);
  if (!context?.candidateId) {
    return onboardingError(404, "CANDIDATE_NOT_FOUND", "Candidate profile missing");
  }

  return NextResponse.json({
    ok: true,
    success: true,
    data: {
      hasPhoto: Boolean(context.currentPath),
      photoVisibility: deriveVisibilityFromPath(context.currentPath),
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "candidate-profile-photo-post", 40);
    if (rateLimitResult) return rateLimitResult;

    const csrfResult = enforceCsrf(request);
    if (csrfResult) return csrfResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
    if (roleCheck) return roleCheck;

    const context = await loadCandidateContext(auth.userId);
    if (!context?.candidateId) {
      return onboardingError(404, "CANDIDATE_NOT_FOUND", "Candidate profile missing");
    }

    const formData = await request.formData();
    const file = formData.get("photo");
    const visibilityInput = formData.get("visibility");

    if (!(file instanceof File)) {
      return onboardingError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
        profilePhoto: "Please select an image file.",
      });
    }

    if (file.size === 0) {
      return onboardingError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
        profilePhoto: "The selected image appears to be empty.",
      });
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return onboardingError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
        profilePhoto: "Photo size must be 3MB or less.",
      });
    }

    const visibility = visibilitySchema.safeParse({
      visibility:
        typeof visibilityInput === "string" && visibilityInput.length > 0
          ? visibilityInput
          : deriveVisibilityFromPath(context.currentPath),
    });

    if (!visibility.success) {
      return onboardingError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
        profilePhotoVisibility: "Invalid photo visibility setting.",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const realMime = detectRealImageMime(buffer);

    if (!realMime) {
      return onboardingError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
        profilePhoto: "Photo must be a valid JPEG, PNG, or WebP image.",
      });
    }

    if (file.type && file.type !== realMime) {
      return onboardingError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
        profilePhoto: "Image content does not match the declared file type.",
      });
    }

    const storagePath = buildStoragePath(auth.userId, context.candidateId, visibility.data.visibility, extFromMime(realMime));
    const supabase = createSupabaseAdminClient();

    const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(storagePath, buffer, {
      contentType: realMime,
      upsert: false,
    });

    if (uploadError) {
      return onboardingError(500, "PROFILE_PHOTO_UPLOAD_FAILED", "Unable to upload profile photo.", {
        profilePhoto: "Unable to upload profile photo right now.",
      });
    }

    const saveError = await upsertPhotoPath(context.candidateId, storagePath);
    if (saveError) {
      await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]).catch(() => undefined);
      return onboardingError(500, "PROFILE_PHOTO_SAVE_FAILED", "Unable to save profile photo metadata.", {
        profilePhoto: "Unable to save profile photo right now.",
      });
    }

    if (context.currentPath && context.currentPath !== storagePath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([context.currentPath]).catch(() => undefined);
    }

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "candidate.profile-photo.uploaded",
      targetType: "candidate_profile",
      targetId: context.candidateId,
      metadata: {
        visibility: visibility.data.visibility,
        mimeType: realMime,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        hasPhoto: true,
        photoVisibility: visibility.data.visibility,
        mimeType: realMime,
        sizeBytes: file.size,
      },
    });
  } catch {
    return onboardingError(500, "PROFILE_PHOTO_UPLOAD_FAILED", "Unable to upload profile photo.", {
      profilePhoto: "Unable to upload profile photo right now.",
    });
  }
}

export async function PUT(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "candidate-profile-photo-put", 60);
    if (rateLimitResult) return rateLimitResult;

    const csrfResult = enforceCsrf(request);
    if (csrfResult) return csrfResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
    if (roleCheck) return roleCheck;

    const context = await loadCandidateContext(auth.userId);
    if (!context?.candidateId) {
      return onboardingError(404, "CANDIDATE_NOT_FOUND", "Candidate profile missing");
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return onboardingError(400, "INVALID_JSON", "Malformed JSON request body");
    }

    const parsed = visibilitySchema.safeParse(payload);
    if (!parsed.success) {
      return onboardingError(400, "VALIDATION_ERROR", "Please correct the highlighted fields.", {
        profilePhotoVisibility: "Invalid photo visibility setting.",
      });
    }

    if (!context.currentPath) {
      return NextResponse.json({
        ok: true,
        success: true,
        data: {
          hasPhoto: false,
          photoVisibility: parsed.data.visibility,
        },
      });
    }

    const previousVisibility = deriveVisibilityFromPath(context.currentPath);
    if (previousVisibility === parsed.data.visibility) {
      return NextResponse.json({
        ok: true,
        success: true,
        data: {
          hasPhoto: true,
          photoVisibility: previousVisibility,
        },
      });
    }

    const extension = context.currentPath.split(".").pop() || "jpg";
    const nextPath = buildStoragePath(auth.userId, context.candidateId, parsed.data.visibility, extension);
    const supabase = createSupabaseAdminClient();

    const { error: moveError } = await supabase.storage.from(AVATAR_BUCKET).move(context.currentPath, nextPath);
    if (moveError) {
      return onboardingError(500, "PROFILE_PHOTO_VISIBILITY_FAILED", "Unable to update photo visibility.", {
        profilePhotoVisibility: "Unable to update photo visibility right now.",
      });
    }

    const saveError = await upsertPhotoPath(context.candidateId, nextPath);
    if (saveError) {
      await supabase.storage.from(AVATAR_BUCKET).move(nextPath, context.currentPath).catch(() => undefined);
      return onboardingError(500, "PROFILE_PHOTO_VISIBILITY_FAILED", "Unable to update photo visibility.", {
        profilePhotoVisibility: "Unable to update photo visibility right now.",
      });
    }

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "candidate.profile-photo.visibility.updated",
      targetType: "candidate_profile",
      targetId: context.candidateId,
      metadata: {
        visibility: parsed.data.visibility,
      },
    });

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        hasPhoto: true,
        photoVisibility: parsed.data.visibility,
      },
    });
  } catch {
    return onboardingError(500, "PROFILE_PHOTO_VISIBILITY_FAILED", "Unable to update photo visibility.", {
      profilePhotoVisibility: "Unable to update photo visibility right now.",
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "candidate-profile-photo-delete", 30);
    if (rateLimitResult) return rateLimitResult;

    const csrfResult = enforceCsrf(request);
    if (csrfResult) return csrfResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
    if (roleCheck) return roleCheck;

    const context = await loadCandidateContext(auth.userId);
    if (!context?.candidateId) {
      return onboardingError(404, "CANDIDATE_NOT_FOUND", "Candidate profile missing");
    }

    const supabase = createSupabaseAdminClient();

    if (context.currentPath) {
      await supabase.storage.from(AVATAR_BUCKET).remove([context.currentPath]).catch(() => undefined);
    }

    const saveError = await upsertPhotoPath(context.candidateId, null);
    if (saveError) {
      return onboardingError(500, "PROFILE_PHOTO_DELETE_FAILED", "Unable to remove profile photo.", {
        profilePhoto: "Unable to remove profile photo right now.",
      });
    }

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "candidate.profile-photo.removed",
      targetType: "candidate_profile",
      targetId: context.candidateId,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      data: {
        hasPhoto: false,
        photoVisibility: "private",
      },
    });
  } catch {
    return onboardingError(500, "PROFILE_PHOTO_DELETE_FAILED", "Unable to remove profile photo.", {
      profilePhoto: "Unable to remove profile photo right now.",
    });
  }
}
