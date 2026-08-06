import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdvertisementSchema } from "@/features/advertisements/schemas";
import type { AdvertisementRecord } from "@/features/advertisements/types";
import { moderateAdvertisementContent } from "@/lib/server/advertisements/moderation";
import {
  AdvertisementMediaIntegrityError,
  createAdvertisement,
  getEmployerAdvertisementByIdForAuthUser,
  logAdvertisementAudit,
  updateAdvertisement,
  verifyAdvertisementMediaObjectExists,
} from "@/lib/server/advertisements/repository";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId, requireEmployerOperationalStatus } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { ADVERTISEMENT_BUCKET } from "@/lib/server/advertisements/constants";
import {
  buildAdvertisementMediaPath,
  getUploadValidationMessage,
  validateAdvertisementMediaMetadata,
  inferExtensionFromMime,
} from "@/lib/server/advertisements/upload";

const finalizeSchema = z.object({
  action: z.literal("finalize"),
  locale: z.enum(["en", "ar"]).default("en"),
  mediaUrl: z.string().trim().min(1).max(500),
  mediaType: z.enum(["image", "video"]),
  advertisementId: z.string().uuid().optional(),
  payload: createAdvertisementSchema,
});

const authorizeSchema = z.object({
  action: z.literal("authorize"),
  locale: z.enum(["en", "ar"]).default("en"),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
});

function createRequestLogger(requestId: string, authUserId?: string, employerId?: string) {
  const startedAt = Date.now();

  function log(stage: string, extra: Record<string, unknown> = {}) {
    console.info(
      JSON.stringify({
        event: "employer_advertisement_upload",
        requestId,
        authUserId: authUserId ?? null,
        employerId: employerId ?? null,
        stage,
        elapsedMs: Date.now() - startedAt,
        ...extra,
      })
    );
  }

  return { log, startedAt };
}

function jsonWithRequestId(
  requestId: string,
  status: number,
  body: Record<string, unknown>,
  log: (stage: string, extra?: Record<string, unknown>) => void,
  stage = "response"
) {
  log(stage, { finalHttpStatus: status });
  return NextResponse.json(
    {
      ...body,
      requestId,
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    }
  );
}

function normalizeWriteError(error: unknown) {
  if (error instanceof AdvertisementMediaIntegrityError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
    };
  }

  const message = error instanceof Error ? error.message : "Advertisement write failed.";
  return {
    status: 500,
    code: "ADVERTISEMENT_WRITE_FAILED",
    message,
  };
}

async function createOrUpdateAdvertisementFromUploadedMedia(input: {
  authUserId: string;
  authRole: string;
  employerId: string;
  advertisementId?: string;
  payload: z.infer<typeof createAdvertisementSchema>;
  verifiedStoragePath: string;
}) {
  if (input.advertisementId) {
    const existing = await getEmployerAdvertisementByIdForAuthUser(input.advertisementId, input.authUserId);
    if (!existing) {
      return {
        ok: false as const,
        status: 404,
        code: "NOT_FOUND",
        message: "Advertisement not found",
      };
    }

    const nextSnapshot: AdvertisementRecord = {
      ...existing,
      ...input.payload,
      media_url: input.verifiedStoragePath,
    };

    const moderation = await moderateAdvertisementContent({
      titleAr: nextSnapshot.title_ar,
      titleEn: nextSnapshot.title_en,
      descriptionAr: nextSnapshot.description_ar,
      descriptionEn: nextSnapshot.description_en,
      ctaTextAr: nextSnapshot.cta_text_ar,
      ctaTextEn: nextSnapshot.cta_text_en,
      targetUrl: nextSnapshot.target_url,
      mediaMetadata: nextSnapshot.media_url,
    });

    const updated = await updateAdvertisement(input.advertisementId, {
      ...input.payload,
      media_url: input.verifiedStoragePath,
      moderation_status: moderation.status,
      moderation_reason: moderation.reason,
      status:
        existing.status === "active"
          ? "paused"
          : existing.status === "pending_review" || existing.status === "rejected"
            ? "draft"
            : existing.status,
    } as Partial<AdvertisementRecord>);

    await logAdvertisementAudit({
      advertisementId: input.advertisementId,
      action: "edit",
      actorAuthUserId: input.authUserId,
      actorRole: input.authRole,
      fromStatus: existing.status,
      toStatus: updated.status,
      reason: moderation.reason,
      metadata: {
        changedFields: Object.keys(input.payload),
        moderationFindings: moderation.findings,
        owner: "employer",
        mediaPath: input.verifiedStoragePath,
      },
    });

    await createAuditLog({
      actorAuthUserId: input.authUserId,
      actorRole: input.authRole,
      action: "employer.advertisement.edit",
      targetType: "advertisement",
      targetId: input.advertisementId,
      metadata: {
        changedFields: Object.keys(input.payload),
        moderationStatus: moderation.status,
        employerId: input.employerId,
        mediaPath: input.verifiedStoragePath,
      },
    });

    return {
      ok: true as const,
      status: 200,
      data: updated,
    };
  }

  const moderation = await moderateAdvertisementContent({
    titleAr: input.payload.title_ar,
    titleEn: input.payload.title_en,
    descriptionAr: input.payload.description_ar,
    descriptionEn: input.payload.description_en,
    ctaTextAr: input.payload.cta_text_ar,
    ctaTextEn: input.payload.cta_text_en,
    targetUrl: input.payload.target_url,
    mediaMetadata: input.verifiedStoragePath,
  });

  const created = await createAdvertisement({
    ...input.payload,
    media_url: input.verifiedStoragePath,
    status: "draft",
    moderation_status: moderation.status,
    moderation_reason: moderation.reason,
    created_by: input.authUserId,
  } as Partial<AdvertisementRecord>);

  await logAdvertisementAudit({
    advertisementId: created.id,
    action: "create",
    actorAuthUserId: input.authUserId,
    actorRole: input.authRole,
    fromStatus: null,
    toStatus: created.status,
    reason: moderation.reason,
    metadata: { moderationFindings: moderation.findings, owner: "employer", mediaPath: input.verifiedStoragePath },
  });

  await createAuditLog({
    actorAuthUserId: input.authUserId,
    actorRole: input.authRole,
    action: "employer.advertisement.create",
    targetType: "advertisement",
    targetId: created.id,
    metadata: { moderationStatus: moderation.status, employerId: input.employerId, mediaPath: input.verifiedStoragePath },
  });

  return {
    ok: true as const,
    status: 201,
    data: created,
  };
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim() || randomUUID();
  const bootstrapLogger = createRequestLogger(requestId);

  const rateLimitResult = enforceRateLimit(request, "employer-advertisement-upload", 40);
  if (rateLimitResult) {
    bootstrapLogger.log("rate_limit_blocked", { finalHttpStatus: 429 });
    return rateLimitResult;
  }

  const csrfResult = enforceCsrf(request);
  if (csrfResult) {
    bootstrapLogger.log("csrf_blocked", { finalHttpStatus: 403 });
    return csrfResult;
  }

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) {
    bootstrapLogger.log("auth_blocked", { finalHttpStatus: 401 });
    return auth;
  }

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) {
    bootstrapLogger.log("role_blocked", { authenticatedUserId: auth.userId, finalHttpStatus: 403 });
    return roleCheck;
  }

  const employer = await getEmployerByAuthUserId(auth.userId);
  const logger = createRequestLogger(requestId, auth.userId, employer?.id);
  logger.log("auth_ok");

  if (!employer) {
    return jsonWithRequestId(
      requestId,
      404,
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      logger.log,
      "employer_missing"
    );
  }

  const statusGate = requireEmployerOperationalStatus(employer.verification_status);
  if (statusGate) {
    logger.log("verification_status_blocked", { verificationStatus: employer.verification_status, finalHttpStatus: 403 });
    return statusGate;
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return jsonWithRequestId(
      requestId,
      415,
      {
        success: false,
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "Use application/json for authorize/finalize upload actions.",
        },
      },
      logger.log,
      "unsupported_content_type"
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonWithRequestId(
      requestId,
      400,
      {
        success: false,
        error: { code: "INVALID_JSON", message: "Request body must be valid JSON." },
      },
      logger.log,
      "json_parse_failed"
    );
  }

  const parsedAction = z
    .object({ action: z.enum(["authorize", "finalize"]) })
    .safeParse(rawPayload);
  if (!parsedAction.success) {
    return jsonWithRequestId(
      requestId,
      400,
      {
        success: false,
        error: { code: "ACTION_REQUIRED", message: "Upload action is required." },
      },
      logger.log,
      "action_missing"
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
      const parsedRaw = rawPayload as {
        fileName?: unknown;
        mimeType?: unknown;
        sizeBytes?: unknown;
      };
      const fallbackValidation = validateAdvertisementMediaMetadata({
        name: typeof parsedRaw.fileName === "string" ? parsedRaw.fileName : "",
        type: typeof parsedRaw.mimeType === "string" ? parsedRaw.mimeType : "",
        size: typeof parsedRaw.sizeBytes === "number" ? parsedRaw.sizeBytes : Number.NaN,
      });

      return jsonWithRequestId(
        requestId,
        400,
        {
          success: false,
          error: {
            code: fallbackValidation.ok ? "VALIDATION_ERROR" : "INVALID_MEDIA",
            message: fallbackValidation.ok
              ? "Upload file metadata is invalid."
              : getUploadValidationMessage(fallbackValidation.reasonKey, locale),
          },
        },
        logger.log,
        "authorize_validation_failed"
      );
    }

    const validation = validateAdvertisementMediaMetadata({
      name: parsed.data.fileName,
      type: parsed.data.mimeType,
      size: parsed.data.sizeBytes,
    });
    logger.log("authorize_validation_complete", {
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      byteSize: parsed.data.sizeBytes,
      mediaType: validation.mediaType ?? null,
      ok: validation.ok,
    });

    if (!validation.ok) {
      return jsonWithRequestId(
        requestId,
        400,
        {
          success: false,
          error: {
            code: "INVALID_MEDIA",
            message: getUploadValidationMessage(validation.reasonKey, locale),
          },
        },
        logger.log,
        "authorize_rejected"
      );
    }

    const extension = inferExtensionFromMime(parsed.data.mimeType);
    const storagePath = buildAdvertisementMediaPath({
      actorAuthUserId: auth.userId,
      extension,
      mediaType: validation.mediaType ?? "image",
      originalName: parsed.data.fileName,
    });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(ADVERTISEMENT_BUCKET)
      .createSignedUploadUrl(storagePath, {
        upsert: false,
      });

    if (error || !data?.token || !data?.path) {
      logger.log("signed_upload_url_failed", {
        fileName: parsed.data.fileName,
        mimeType: parsed.data.mimeType,
        byteSize: parsed.data.sizeBytes,
        supabaseErrorCode: error?.name ?? "UNKNOWN",
        supabaseErrorMessage: error?.message ?? "Unknown signed upload URL error",
      });
      return jsonWithRequestId(
        requestId,
        500,
        {
          success: false,
          error: {
            code: "UPLOAD_AUTH_FAILED",
            message: locale === "ar" ? "تعذر تجهيز رفع الملف حالياً." : "Unable to prepare media upload right now.",
          },
        },
        logger.log,
        "authorize_failed"
      );
    }

    logger.log("authorize_ready", {
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      byteSize: parsed.data.sizeBytes,
      mediaType: validation.mediaType,
      uploadPath: data.path,
    });

    return jsonWithRequestId(
      requestId,
      200,
      {
        success: true,
        data: {
          mediaType: validation.mediaType,
          mediaUrl: data.path,
          signedUploadToken: data.token,
          bucket: ADVERTISEMENT_BUCKET,
          mimeType: parsed.data.mimeType,
          sizeBytes: parsed.data.sizeBytes,
        },
      },
      logger.log,
      "authorize_success"
    );
  }

  const parsedFinalize = finalizeSchema.safeParse(rawPayload);
  if (!parsedFinalize.success) {
    return jsonWithRequestId(
      requestId,
      400,
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Finalize payload is invalid." },
      },
      logger.log,
      "finalize_validation_failed"
    );
  }

  const { mediaUrl, mediaType, payload, advertisementId } = parsedFinalize.data;
  logger.log("finalize_started", {
    fileName: mediaUrl.split("/").pop() ?? "unknown",
    mimeType: payload.media_type === "video" ? "video/*" : "image/*",
    byteSize: null,
    uploadPath: mediaUrl,
  });

  const normalizedPath = mediaUrl.trim().replace(/^\/+/, "");
  const ownerPrefix = `${auth.userId}/`;
  if (!normalizedPath.startsWith(ownerPrefix) || !normalizedPath.includes(`/${mediaType}/`)) {
    return jsonWithRequestId(
      requestId,
      400,
      {
        success: false,
        error: {
          code: "INVALID_MEDIA_URL",
          message:
            locale === "ar"
              ? "مسار الملف غير صالح لحساب صاحب العمل الحالي."
              : "Media path is invalid for the current employer account.",
        },
      },
      logger.log,
      "finalize_owner_path_mismatch"
    );
  }

  const mediaCheck = await verifyAdvertisementMediaObjectExists(normalizedPath);
  logger.log("finalize_storage_check", {
    uploadPath: normalizedPath,
    storageCheckOk: mediaCheck.ok,
    storageCheckCode: mediaCheck.ok ? null : mediaCheck.code,
  });

  if (!mediaCheck.ok) {
    return jsonWithRequestId(
      requestId,
      400,
      {
        success: false,
        error: {
          code: mediaCheck.code,
          message: mediaCheck.message,
        },
      },
      logger.log,
      "finalize_media_missing"
    );
  }

  if (payload.media_type !== mediaType) {
    return jsonWithRequestId(
      requestId,
      400,
      {
        success: false,
        error: {
          code: "MEDIA_TYPE_MISMATCH",
          message: locale === "ar" ? "نوع الوسائط لا يطابق الملف المرفوع." : "Media type does not match uploaded file.",
        },
      },
      logger.log,
      "finalize_media_type_mismatch"
    );
  }

  try {
    const writeResult = await createOrUpdateAdvertisementFromUploadedMedia({
      authUserId: auth.userId,
      authRole: auth.role,
      employerId: employer.id,
      advertisementId,
      payload,
      verifiedStoragePath: mediaCheck.storagePath,
    });

    if (!writeResult.ok) {
      return jsonWithRequestId(
        requestId,
        writeResult.status,
        {
          success: false,
          error: {
            code: writeResult.code,
            message: writeResult.message,
          },
        },
        logger.log,
        "finalize_write_rejected"
      );
    }

    logger.log("finalize_write_success", {
      advertisementId: writeResult.data.id,
      uploadPath: mediaCheck.storagePath,
    });

    return jsonWithRequestId(
      requestId,
      writeResult.status,
      {
        success: true,
        data: {
          advertisement: writeResult.data,
          mediaUrl: mediaCheck.storagePath,
          mediaType,
          bucket: ADVERTISEMENT_BUCKET,
        },
      },
      logger.log,
      "finalize_success"
    );
  } catch (error) {
    const normalizedError = normalizeWriteError(error);
    logger.log("finalize_write_failed", {
      uploadPath: mediaCheck.storagePath,
      supabaseErrorCode: normalizedError.code,
      supabaseErrorMessage: normalizedError.message,
    });

    const supabase = createSupabaseAdminClient();
    const { error: removeError } = await supabase.storage.from(ADVERTISEMENT_BUCKET).remove([mediaCheck.storagePath]);
    if (removeError) {
      logger.log("finalize_cleanup_failed", {
        uploadPath: mediaCheck.storagePath,
        supabaseErrorCode: removeError.name ?? "UNKNOWN",
        supabaseErrorMessage: removeError.message,
      });
    } else {
      logger.log("finalize_cleanup_success", { uploadPath: mediaCheck.storagePath });
    }

    return jsonWithRequestId(
      requestId,
      normalizedError.status,
      {
        success: false,
        error: {
          code: normalizedError.code,
          message: normalizedError.message,
        },
      },
      logger.log,
      "finalize_failed"
    );
  }
}