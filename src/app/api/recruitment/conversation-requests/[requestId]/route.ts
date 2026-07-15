import { NextResponse } from "next/server";
import { recruitmentConversationRequestActionSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { reviewConversationRequest, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversation-request-patch", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentConversationRequestActionSchema);
  if (parsed.error) return parsed.error;

  try {
    const { requestId } = await params;
    const data = await reviewConversationRequest(auth, requestId, {
      action: parsed.data.action,
      assignedStaffUserId: parsed.data.assignedStaffUserId,
      rejectionReason: parsed.data.rejectionReason,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to review conversation request");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_REQUEST_REVIEW_FAILED", message: normalized.message } }, { status: 400 });
  }
}