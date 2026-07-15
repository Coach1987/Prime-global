import { NextResponse } from "next/server";
import { z } from "zod";
import { recruitmentAiSupervisorActionSchema } from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { executeAiSupervisorAction, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

const aiWorkflowSchema = recruitmentAiSupervisorActionSchema
  .extend({
    conversationId: z.string().uuid(),
  })
  .strict();

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "ai-supervisor-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, aiWorkflowSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await executeAiSupervisorAction(auth, parsed.data.conversationId, {
      action: parsed.data.action,
      taskType: parsed.data.taskType,
      message: parsed.data.message,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to execute AI supervisor action");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json(
      { success: false, error: { code: "AI_SUPERVISOR_FAILED", message: normalized.message } },
      { status: 400 }
    );
  }
}
