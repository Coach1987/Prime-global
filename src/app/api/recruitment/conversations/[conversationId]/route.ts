import { NextResponse } from "next/server";
import { recruitmentConversationUpdateSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { getConversationDetail, toHttpError, updateConversationForStaff } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;
const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversation-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const { conversationId } = await params;
    const data = await getConversationDetail(auth, conversationId, locale);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load conversation");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_CONVERSATION_LOAD_FAILED", message: normalized.message } }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversation-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentConversationUpdateSchema);
  if (parsed.error) return parsed.error;

  try {
    const { conversationId } = await params;
    const data = await updateConversationForStaff(auth, conversationId, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to update conversation");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_CONVERSATION_UPDATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}