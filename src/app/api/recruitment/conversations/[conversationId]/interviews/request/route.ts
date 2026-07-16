import { NextResponse } from "next/server";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requestInterviewByEmployer, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { z } from "zod";

const requestSchema = z.object({
  note: z.string().trim().max(1200).optional(),
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interview-request-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, requestSchema);
  if (parsed.error) return parsed.error;

  try {
    const { conversationId } = await params;
    const data = await requestInterviewByEmployer(auth, conversationId, {
      note: parsed.data.note,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data }, { status: 202 });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to request interview");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEW_REQUEST_FAILED", message: normalized.message } }, { status: 400 });
  }
}
