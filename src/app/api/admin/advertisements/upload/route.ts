import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { ADVERTISEMENT_BUCKET, AD_ADMIN_ROLES } from "@/lib/server/advertisements/constants";
import {
  buildAdvertisementMediaPath,
  getUploadValidationMessage,
  inferExtensionFromMime,
  validateAdvertisementMedia,
} from "@/lib/server/advertisements/upload";


export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisement-upload", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, AD_ADMIN_ROLES);
  if (roleCheck) return roleCheck;

  const formData = await request.formData();
  const file = formData.get("file");
  const locale = String(formData.get("locale") ?? "en") === "ar" ? "ar" : "en";

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FILE_REQUIRED",
          message: getUploadValidationMessage("file_required", locale),
        },
      },
      { status: 400 }
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const validation = validateAdvertisementMedia(file, fileBuffer);

  if (!validation.ok) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_MEDIA",
          message: getUploadValidationMessage(validation.reasonKey, locale),
          reasonKey: validation.reasonKey,
        },
      },
      { status: 400 }
    );
  }

  const extension = inferExtensionFromMime(file.type);
  const storagePath = buildAdvertisementMediaPath({
    actorAuthUserId: auth.userId,
    extension,
    mediaType: validation.mediaType ?? "image",
    originalName: file.name,
  });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(ADVERTISEMENT_BUCKET).upload(storagePath, fileBuffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: locale === "ar" ? "تعذر رفع الملف حالياً. حاول مرة أخرى." : "Unable to upload file right now.",
        },
      },
      { status: 500 }
    );
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "admin.advertisement.upload",
    targetType: "advertisement_media",
    metadata: {
      storagePath,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      mediaType: validation.mediaType,
      mediaUrl: storagePath,
      sizeBytes: file.size,
      mimeType: file.type,
      bucket: ADVERTISEMENT_BUCKET,
    },
  });
}
