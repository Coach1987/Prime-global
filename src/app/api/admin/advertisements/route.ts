import { NextResponse } from "next/server";
import {
  createAdvertisementSchema,
  advertisementStatusFilterSchema,
} from "@/features/advertisements/schemas";
import { AdvertisementRecord } from "@/features/advertisements/types";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { createAuditLog } from "@/lib/server/security/audit";
import { AD_ADMIN_ROLES } from "@/lib/server/advertisements/constants";
import { moderateAdvertisementContent } from "@/lib/server/advertisements/moderation";
import {
  AdvertisementMediaIntegrityError,
  createAdvertisement,
  listAdminAdvertisements,
  logAdvertisementAudit,
  verifyAdvertisementMediaObjectExists,
} from "@/lib/server/advertisements/repository";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisements-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, AD_ADMIN_ROLES);
  if (roleCheck) return roleCheck;

  const url = new URL(request.url);
  const parsedFilter = advertisementStatusFilterSchema.safeParse({
    status: url.searchParams.get("status") ?? "all",
  });

  if (!parsedFilter.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_FILTER", message: "Invalid status filter" } },
      { status: 400 }
    );
  }

  const data = await listAdminAdvertisements(parsedFilter.data.status);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-advertisements-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, AD_ADMIN_ROLES);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, createAdvertisementSchema);
  if (parsed.error) return parsed.error;

  const mediaCheck = await verifyAdvertisementMediaObjectExists(parsed.data.media_url);
  if (!mediaCheck.ok) {
    return NextResponse.json(
      { success: false, error: { code: mediaCheck.code, message: mediaCheck.message } },
      { status: 400 }
    );
  }

  const moderation = await moderateAdvertisementContent({
    titleAr: parsed.data.title_ar,
    titleEn: parsed.data.title_en,
    descriptionAr: parsed.data.description_ar,
    descriptionEn: parsed.data.description_en,
    ctaTextAr: parsed.data.cta_text_ar,
    ctaTextEn: parsed.data.cta_text_en,
    targetUrl: parsed.data.target_url,
    mediaMetadata: parsed.data.media_url,
  });

  let created: AdvertisementRecord;

  try {
    created = await createAdvertisement({
      ...parsed.data,
      media_url: mediaCheck.storagePath,
      status: "draft",
      moderation_status: moderation.status,
      moderation_reason: moderation.reason,
      created_by: auth.userId,
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
    advertisementId: created.id,
    action: "create",
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    fromStatus: null,
    toStatus: created.status,
    reason: moderation.reason,
    metadata: { moderationFindings: moderation.findings },
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "admin.advertisement.create",
    targetType: "advertisement",
    targetId: created.id,
    metadata: { moderationStatus: moderation.status },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
