import { NextResponse } from "next/server";
import { recruitmentModerationActionSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { moderateRecruitmentMessage, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-message-moderation-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentModerationActionSchema);
  if (parsed.error) return parsed.error;

  try {
    const { messageId } = await params;
    const data = await moderateRecruitmentMessage(auth, messageId, {
      action: parsed.data.action,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to moderate message");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_MESSAGE_MODERATION_FAILED", message: normalized.message } }, { status: 400 });
  }
}