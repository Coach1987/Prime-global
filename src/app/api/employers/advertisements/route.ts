import { NextResponse } from "next/server";
import { createAdvertisementSchema } from "@/features/advertisements/schemas";
import type { AdvertisementRecord } from "@/features/advertisements/types";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { createAuditLog } from "@/lib/server/security/audit";
import { getEmployerByAuthUserId, requireEmployerOperationalStatus } from "@/lib/server/employers";
import { moderateAdvertisementContent } from "@/lib/server/advertisements/moderation";
import {
  AdvertisementMediaIntegrityError,
  createAdvertisement,
  listEmployerAdvertisementsByAuthUserId,
  logAdvertisementAudit,
  verifyAdvertisementMediaObjectExists,
} from "@/lib/server/advertisements/repository";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-advertisements-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const statusGate = requireEmployerOperationalStatus(employer.verification_status);
  if (statusGate) return statusGate;

  const data = await listEmployerAdvertisementsByAuthUserId(auth.userId);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-advertisements-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const statusGate = requireEmployerOperationalStatus(employer.verification_status);
  if (statusGate) return statusGate;

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
    metadata: { moderationFindings: moderation.findings, owner: "employer" },
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.advertisement.create",
    targetType: "advertisement",
    targetId: created.id,
    metadata: { moderationStatus: moderation.status, employerId: employer.id },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}