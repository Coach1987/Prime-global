import { NextResponse } from "next/server";
import { z } from "zod";
import { updateAdvertisementSchema } from "@/features/advertisements/schemas";
import type { AdvertisementRecord } from "@/features/advertisements/types";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { createAuditLog } from "@/lib/server/security/audit";
import { getEmployerByAuthUserId, requireEmployerOperationalStatus } from "@/lib/server/employers";
import { moderateAdvertisementContent } from "@/lib/server/advertisements/moderation";
import {
  deleteAdvertisement,
  getEmployerAdvertisementByIdForAuthUser,
  logAdvertisementAudit,
  updateAdvertisement,
} from "@/lib/server/advertisements/repository";

const idSchema = z.string().uuid();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-advertisement-get", 120);
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

  const { advertisementId } = await params;
  if (!idSchema.safeParse(advertisementId).success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid advertisement id" } },
      { status: 400 }
    );
  }

  const data = await getEmployerAdvertisementByIdForAuthUser(advertisementId, auth.userId);
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
  const rateLimitResult = enforceRateLimit(request, "employer-advertisement-patch", 80);
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

  const parsed = await parseJsonBody(request, updateAdvertisementSchema);
  if (parsed.error) return parsed.error;

  const nextSnapshot: AdvertisementRecord = {
    ...existing,
    ...parsed.data,
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

  const updated = await updateAdvertisement(advertisementId, {
    ...parsed.data,
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
    advertisementId,
    action: "edit",
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    fromStatus: existing.status,
    toStatus: updated.status,
    reason: moderation.reason,
    metadata: { changedFields: Object.keys(parsed.data), moderationFindings: moderation.findings, owner: "employer" },
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.advertisement.edit",
    targetType: "advertisement",
    targetId: advertisementId,
    metadata: { changedFields: Object.keys(parsed.data), moderationStatus: moderation.status, employerId: employer.id },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-advertisement-delete", 30);
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

  await logAdvertisementAudit({
    advertisementId,
    action: "delete",
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    fromStatus: existing.status,
    toStatus: null,
    metadata: { owner: "employer" },
  });

  await deleteAdvertisement(advertisementId);

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.advertisement.delete",
    targetType: "advertisement",
    targetId: advertisementId,
    metadata: { employerId: employer.id },
  });

  return NextResponse.json({ success: true, data: { id: advertisementId } });
}