import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { acceptInterviewCoordinationTerms, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const RECRUITMENT_ROLES = ["candidate", "employer"] as const;
const acceptTermsSchema = z.object({
  locale: z.enum(["en", "ar"]).optional().default("en"),
});

export async function POST(request: Request, { params }: { params: Promise<{ interviewId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-interview-coordination-terms-post", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, acceptTermsSchema);
  if (parsed.error) return parsed.error;

  try {
    const { interviewId } = await params;
    const data = await acceptInterviewCoordinationTerms(auth, interviewId, { locale: parsed.data.locale ?? "en" });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to accept coordination terms");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_INTERVIEW_TERMS_ACCEPT_FAILED", message: normalized.message } }, { status: 400 });
  }
}
