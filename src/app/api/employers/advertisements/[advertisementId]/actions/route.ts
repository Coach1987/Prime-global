import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { getEmployerByAuthUserId, requireEmployerOperationalStatus } from "@/lib/server/employers";
import { advertisementActionSchema } from "@/features/advertisements/schemas";
import { moderateAdvertisementContent } from "@/lib/server/advertisements/moderation";
import {
  attachSignedMediaUrl,
  AdvertisementMediaIntegrityError,
  getEmployerAdvertisementByIdForAuthUser,
  logAdvertisementAudit,
  updateAdvertisement,
  verifyAdvertisementMediaObjectExists,
} from "@/lib/server/advertisements/repository";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";

const idSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-advertisement-action", 60);
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

  const { advertisementId } = await params;
  if (!idSchema.safeParse(advertisementId).success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid advertisement id" } },
      { status: 400 }
    );
  }

  const existing = await getEmployerAdvertisementByIdForAuthUser(advertisementId, auth.userId);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Advertisement not found" } },
      { status: 404 }
    );
  }

  const parsed = await parseJsonBody(request, advertisementActionSchema);
  if (parsed.error) return parsed.error;

  if (parsed.data.action !== "submit_review") {
    return NextResponse.json(
      { success: false, error: { code: "ACTION_NOT_ALLOWED", message: "Employers can only submit advertisements for review." } },
      { status: 403 }
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
            "Cannot submit advertisement for review because media upload did not complete successfully or the storage object is missing. Re-upload media and try again.",
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

  const nextStatus = moderation.status === "failed" ? "draft" : "pending_review";
  let updated;

  try {
    updated = await updateAdvertisement(advertisementId, {
      status: nextStatus,
      moderation_status: moderation.status,
      moderation_reason: moderation.reason,
    });
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
    action: "submit_review",
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    fromStatus: existing.status,
    toStatus: nextStatus,
    reason: moderation.reason,
    metadata: { moderationFindings: moderation.findings, owner: "employer" },
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.advertisement.submit_review",
    targetType: "advertisement",
    targetId: advertisementId,
    metadata: { moderationStatus: moderation.status, employerId: employer.id },
  });

  const withSignedMedia = await attachSignedMediaUrl(updated);
  return NextResponse.json({ success: true, data: withSignedMedia });
}