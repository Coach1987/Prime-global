import { NextResponse } from "next/server";
import { recruitmentAiSupervisorActionSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { executeAiSupervisorAction, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-ai-supervisor-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentAiSupervisorActionSchema);
  if (parsed.error) return parsed.error;

  try {
    const { conversationId } = await params;
    const data = await executeAiSupervisorAction(auth, conversationId, {
      ...parsed.data,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to execute AI supervisor action");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json(
      { success: false, error: { code: "RECRUITMENT_AI_SUPERVISOR_FAILED", message: normalized.message } },
      { status: 400 }
    );
  }
}
