import { NextResponse } from "next/server";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { getInterviewMeetingCenter, postInterviewMeetingChatMessage, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { z } from "zod";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;
const chatSchema = z.object({
  body: z.string().trim().min(1).max(3000),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export async function GET(request: Request, { params }: { params: Promise<{ interviewId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interview-chat-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const { interviewId } = await params;
    const data = await getInterviewMeetingCenter(auth, interviewId, locale);
    return NextResponse.json({ success: true, data: data.chatMessages });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load interview chat");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEW_CHAT_LOAD_FAILED", message: normalized.message } }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ interviewId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interview-chat-post", 120);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, chatSchema);
  if (parsed.error) return parsed.error;

  try {
    const { interviewId } = await params;
    const data = await postInterviewMeetingChatMessage(auth, interviewId, {
      body: parsed.data.body,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to send interview chat message");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEW_CHAT_CREATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}
