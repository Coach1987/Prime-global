import { NextResponse } from "next/server";
import { recruitmentInterviewCreateSchema } from "@/features/recruitment/schemas/supervised";
import { createConversationInterview, getConversationDetail, toHttpError } from "@/lib/server/recruitment/service";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;
const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interviews-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const { conversationId } = await params;
    const data = await getConversationDetail(auth, conversationId, locale);
    return NextResponse.json({ success: true, data: data.interviews });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load interviews");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEWS_LOAD_FAILED", message: normalized.message } }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interviews-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentInterviewCreateSchema);
  if (parsed.error) return parsed.error;

  try {
    const { conversationId } = await params;
    const data = await createConversationInterview(auth, conversationId, {
      scheduledAt: parsed.data.scheduledAt,
      durationMinutes: parsed.data.durationMinutes ?? 45,
      waitingRoomEnabled: parsed.data.waitingRoomEnabled ?? true,
      cameraEnabled: parsed.data.cameraEnabled ?? true,
      microphoneEnabled: parsed.data.microphoneEnabled ?? true,
      screenSharingEnabled: parsed.data.screenSharingEnabled ?? true,
      interviewNotes: parsed.data.interviewNotes ?? null,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to schedule interview");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEW_CREATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}