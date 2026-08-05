import { NextResponse } from "next/server";
import { z } from "zod";
import { updateAdvertisementSchema } from "@/features/advertisements/schemas";
import { AdvertisementRecord } from "@/features/advertisements/types";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { createAuditLog } from "@/lib/server/security/audit";
import { AD_ADMIN_ROLES } from "@/lib/server/advertisements/constants";
import { moderateAdvertisementContent } from "@/lib/server/advertisements/moderation";
import {
  AdvertisementMediaIntegrityError,
  deleteAdvertisement,
  getAdminAdvertisementById,
  logAdvertisementAudit,
  updateAdvertisement,
  verifyAdvertisementMediaObjectExists,
} from "@/lib/server/advertisements/repository";

const idSchema = z.string().uuid();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisement-get", 120);
  if (rateLimitResult) return rateLimitResult;

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

  const data = await getAdminAdvertisementById(advertisementId);
  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Advertisement not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisement-patch", 80);
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

  const parsed = await parseJsonBody(request, updateAdvertisementSchema);
  if (parsed.error) return parsed.error;

  const nextSnapshot: AdvertisementRecord = {
    ...existing,
    ...parsed.data,
  };

  const mediaCheck = await verifyAdvertisementMediaObjectExists(nextSnapshot.media_url);
  if (!mediaCheck.ok) {
    return NextResponse.json(
      { success: false, error: { code: mediaCheck.code, message: mediaCheck.message } },
      { status: 400 }
    );
  }

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

  let updated: AdvertisementRecord;

  try {
    updated = await updateAdvertisement(advertisementId, {
      ...parsed.data,
      media_url: parsed.data.media_url ? mediaCheck.storagePath : undefined,
      moderation_status: moderation.status,
      moderation_reason: moderation.reason,
      status: existing.status === "active" && moderation.status !== "passed" ? "paused" : existing.status,
    } as Partial<AdvertisementRecord>);
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
    action: "edit",
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    fromStatus: existing.status,
    toStatus: updated.status,
    reason: moderation.reason,
    metadata: { changedFields: Object.keys(parsed.data), moderationFindings: moderation.findings },
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "admin.advertisement.edit",
    targetType: "advertisement",
    targetId: advertisementId,
    metadata: { changedFields: Object.keys(parsed.data), moderationStatus: moderation.status },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisement-delete", 30);
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

  await logAdvertisementAudit({
    advertisementId,
    action: "delete",
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    fromStatus: existing.status,
    toStatus: null,
  });

  await deleteAdvertisement(advertisementId);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "admin.advertisement.delete",
    targetType: "advertisement",
    targetId: advertisementId,
  });

  return NextResponse.json({ success: true, data: { id: advertisementId } });
}
