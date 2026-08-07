import { NextResponse } from "next/server";
import { z } from "zod";
import { advertisementActionSchema } from "@/features/advertisements/schemas";
import { AdvertisementRecord } from "@/features/advertisements/types";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { createAuditLog } from "@/lib/server/security/audit";
import { AD_ADMIN_ROLES } from "@/lib/server/advertisements/constants";
import { moderateAdvertisementContent } from "@/lib/server/advertisements/moderation";
import {
  attachSignedMediaUrl,
  AdvertisementMediaIntegrityError,
  getAdminAdvertisementById,
  logAdvertisementAudit,
  updateAdvertisement,
  verifyAdvertisementMediaObjectExists,
} from "@/lib/server/advertisements/repository";

const idSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisement-action", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, AD_ADMIN_ROLES);
  if (roleCheck) return roleCheck;

  const { advertisementId } = await params;
  if (!idSchema.safeParse(advertisementId).success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid advertisement id" } },
      { status: 400 }
    );
  }

  const existing = await getAdminAdvertisementById(advertisementId);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Advertisement not found" } },
      { status: 404 }
    );
  }

  const parsed = await parseJsonBody(request, advertisementActionSchema);
  if (parsed.error) return parsed.error;

  const nowIso = new Date().toISOString();
  const action = parsed.data.action;
  let patch: Partial<AdvertisementRecord> = {};
  let toStatus: string | null = existing.status;

  if (action === "submit_review") {
    const mediaCheck = await verifyAdvertisementMediaObjectExists(existing.media_url);
    if (!mediaCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: mediaCheck.code,
            message:
              "Cannot submit advertisement for review because media upload did not complete successfully or the storage object is missing.",
          },
        },
        { status: 400 }
      );
    }

    const moderation = await moderateAdvertisementContent({
      titleAr: existing.title_ar,
      titleEn: existing.title_en,
      descriptionAr: existing.description_ar,
      descriptionEn: existing.description_en,
      ctaTextAr: existing.cta_text_ar,
      ctaTextEn: existing.cta_text_en,
      targetUrl: existing.target_url,
      mediaMetadata: existing.media_url,
    });

    patch = {
      status: moderation.status === "failed" ? "draft" : "pending_review",
      moderation_status: moderation.status,
      moderation_reason: moderation.reason,
    };
    toStatus = String(patch.status);
  }

  if (action === "approve") {
    if (existing.status !== "pending_review" || existing.moderation_status === "failed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "APPROVAL_BLOCKED",
            message: "Only advertisements in pending review that did not fail moderation can be approved",
          },
        },
        { status: 400 }
      );
    }

    const mediaCheck = await verifyAdvertisementMediaObjectExists(existing.media_url);
    if (!mediaCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: mediaCheck.code,
            message:
              "Cannot approve advertisement because media upload did not complete successfully or the storage object is missing.",
          },
        },
        { status: 400 }
      );
    }

    patch = {
      status: "active",
      approved_by: auth.userId,
      approved_at: nowIso,
      moderation_status: "passed",
    };
    toStatus = "active";
  }

  if (action === "reject") {
    patch = {
      status: "rejected",
      moderation_reason: parsed.data.reason ?? existing.moderation_reason,
    };
    toStatus = "rejected";
  }

  if (action === "request_edits") {
    patch = {
      status: "draft",
      moderation_reason: parsed.data.reason ?? existing.moderation_reason,
    };
    toStatus = "draft";
  }

  if (action === "activate" || action === "republish") {
    if (!["approved", "paused", "active"].includes(existing.status) || existing.moderation_status === "failed") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ACTIVATION_BLOCKED",
            message: "Only approved or hidden advertisements that did not fail moderation can be republished",
          },
        },
        { status: 400 }
      );
    }

    const mediaCheck = await verifyAdvertisementMediaObjectExists(existing.media_url);
    if (!mediaCheck.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: mediaCheck.code,
            message:
              "Cannot activate advertisement because media upload did not complete successfully or the storage object is missing.",
          },
        },
        { status: 400 }
      );
    }

    patch = { status: "active", moderation_status: "passed" };
    toStatus = "active";
  }

  if (action === "pause" || action === "hide") {
    patch = { status: "paused" };
    toStatus = "paused";
  }

  let updated;

  try {
    updated = await updateAdvertisement(advertisementId, patch);
  } catch (error) {
    if (error instanceof AdvertisementMediaIntegrityError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status }
      );
    }

    throw error;
  }

  await logAdvertisementAudit({
    advertisementId,
    action,
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    fromStatus: existing.status,
    toStatus,
    reason: parsed.data.reason ?? null,
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: `admin.advertisement.${action}`,
    targetType: "advertisement",
    targetId: advertisementId,
    metadata: { fromStatus: existing.status, toStatus },
  });

  const withSignedMedia = await attachSignedMediaUrl(updated);
  return NextResponse.json({ success: true, data: withSignedMedia });
}
