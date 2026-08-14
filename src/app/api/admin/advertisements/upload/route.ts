import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { ADVERTISEMENT_BUCKET, AD_ADMIN_ROLES } from "@/lib/server/advertisements/constants";
import {
  authorizeAdvertisementMediaUpload,
  finalizeAdvertisementMediaUpload,
} from "@/lib/server/advertisements/signed-upload";

// Admin advertisement media upload, split into authorize + finalize steps so
// media bytes go directly from the browser to Supabase Storage via a signed
// upload URL and never pass through this Next.js serverless function. A
// single POST that read the raw file body here previously hit Vercel's
// platform-level request body limit (~4.5MB) for any real video upload,
// regardless of this app's own 50MB video size allowance. Mirrors the
// employer advertisement upload flow, which already uses this pattern.

const authorizeSchema = z.object({
  action: z.literal("authorize"),
  locale: z.enum(["en", "ar"]).default("en"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
});

const finalizeSchema = z.object({
  action: z.literal("finalize"),
  locale: z.enum(["en", "ar"]).default("en"),
  mediaUrl: z.string().trim().min(1).max(500),
  mediaType: z.enum(["image", "video"]),
});

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisement-upload", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, AD_ADMIN_ROLES);
  if (roleCheck) return roleCheck;

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Use application/json for authorize/finalize upload actions.",
        },
      },
      { status: 415 }
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_JSON", message: "Request body must be valid JSON." },
      },
      { status: 400 }
    );
  }

  const parsedAction = z.object({ action: z.enum(["authorize", "finalize"]) }).safeParse(rawPayload);
  if (!parsedAction.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "ACTION_REQUIRED", message: "Upload action is required." },
      },
      { status: 400 }
    );
  }

  const locale =
    typeof (rawPayload as { locale?: unknown }).locale === "string" &&
    (rawPayload as { locale?: string }).locale === "ar"
      ? "ar"
      : "en";

  if (parsedAction.data.action === "authorize") {
    const parsed = authorizeSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: locale === "ar" ? "بيانات الملف غير صالحة." : "Upload file metadata is invalid.",
          },
        },
        { status: 400 }
      );
    }

    const authorization = await authorizeAdvertisementMediaUpload({
      actorAuthUserId: auth.userId,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      locale,
    });

    if (!authorization.ok) {
      return NextResponse.json(
        {
          success: false,
          error: { code: authorization.code, message: authorization.message },
        },
        { status: authorization.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        mediaType: authorization.mediaType,
        mediaUrl: authorization.storagePath,
        signedUploadToken: authorization.signedUploadToken,
        bucket: ADVERTISEMENT_BUCKET,
        mimeType: parsed.data.mimeType,
        sizeBytes: parsed.data.sizeBytes,
      },
    });
  }

  const parsedFinalize = finalizeSchema.safeParse(rawPayload);
  if (!parsedFinalize.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: locale === "ar" ? "بيانات الإنهاء غير صالحة." : "Finalize payload is invalid.",
        },
      },
      { status: 400 }
    );
  }

  const finalization = await finalizeAdvertisementMediaUpload({
    actorAuthUserId: auth.userId,
    mediaUrl: parsedFinalize.data.mediaUrl,
    mediaType: parsedFinalize.data.mediaType,
    locale,
  });

  if (!finalization.ok) {
    return NextResponse.json(
      {
        success: false,
        error: { code: finalization.code, message: finalization.message },
      },
      { status: finalization.status }
    );
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "admin.advertisement.upload",
    targetType: "advertisement_media",
    metadata: {
      storagePath: finalization.storagePath,
      mediaType: parsedFinalize.data.mediaType,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      mediaType: parsedFinalize.data.mediaType,
      mediaUrl: finalization.storagePath,
      bucket: ADVERTISEMENT_BUCKET,
    },
  });
}
