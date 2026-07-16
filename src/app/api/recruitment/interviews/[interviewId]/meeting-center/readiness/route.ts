import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { setInterviewParticipantReadiness, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;
const readinessSchema = z.object({
  ready: z.boolean(),
});

export async function POST(request: Request, { params }: { params: Promise<{ interviewId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interview-readiness-post", 120);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, readinessSchema);
  if (parsed.error) return parsed.error;

  try {
    const { interviewId } = await params;
    const data = await setInterviewParticipantReadiness(auth, interviewId, parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to update readiness");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEW_READINESS_UPDATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}
