import { NextResponse } from "next/server";
import { recruitmentConversationResponseSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { respondToConversationInvitation, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversation-respond-post", 50);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentConversationResponseSchema);
  if (parsed.error) return parsed.error;

  try {
    const { conversationId } = await params;
    const data = await respondToConversationInvitation(auth, conversationId, {
      action: parsed.data.action,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to respond to invitation");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_CONVERSATION_RESPONSE_FAILED", message: normalized.message } }, { status: 400 });
  }
}