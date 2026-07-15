import { NextResponse } from "next/server";
import { recruitmentInterviewUpdateSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { toHttpError, updateRecruitmentInterview } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ interviewId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interview-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentInterviewUpdateSchema);
  if (parsed.error) return parsed.error;

  try {
    const { interviewId } = await params;
    const data = await updateRecruitmentInterview(auth, interviewId, {
      status: parsed.data.status,
      interviewResult: parsed.data.interviewResult ?? null,
      interviewNotes: parsed.data.interviewNotes ?? null,
      scheduledAt: parsed.data.scheduledAt,
      durationMinutes: parsed.data.durationMinutes,
      hostAction: parsed.data.hostAction,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to update interview");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEW_UPDATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}