import { NextResponse } from "next/server";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { joinInterviewMeeting, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { z } from "zod";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;
const joinSchema = z.object({
  joinToken: z.string().trim().min(20).max(255),
});

export async function POST(request: Request, { params }: { params: Promise<{ interviewId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interview-meeting-center-join-post", 90);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, joinSchema);
  if (parsed.error) return parsed.error;

  try {
    const { interviewId } = await params;
    const data = await joinInterviewMeeting(auth, interviewId, parsed.data.joinToken);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to join meeting");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_MEETING_JOIN_FAILED", message: normalized.message } }, { status: 400 });
  }
}
