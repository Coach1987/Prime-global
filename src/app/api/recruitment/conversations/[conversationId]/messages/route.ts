import { NextResponse } from "next/server";
import { recruitmentConversationMessageSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { postConversationMessage, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversation-message-post", 90);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentConversationMessageSchema);
  if (parsed.error) return parsed.error;

  try {
    const { conversationId } = await params;
    const data = await postConversationMessage(auth, conversationId, {
      body: parsed.data.body,
      locale: parsed.data.locale ?? "en",
      attachments: parsed.data.attachments ?? [],
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to send message");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_MESSAGE_CREATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}