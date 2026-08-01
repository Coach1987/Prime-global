import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { applyAdminEmployerAction } from "@/lib/server/admin/employers";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";

const ADMIN_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;
const idSchema = z.string().uuid();
const actionSchema = z.object({
  action: z.enum(["approve", "reject", "suspend", "reactivate", "delete"]),
  reason: z.string().trim().min(3).max(1200).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employerId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "admin-employer-action", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...ADMIN_ROLES]);
  if (roleCheck) return roleCheck;

  const { employerId } = await params;
  if (!idSchema.safeParse(employerId).success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid employer id" } },
      { status: 400 }
    );
  }

  const parsed = await parseJsonBody(request, actionSchema);
  if (parsed.error) return parsed.error;

  if ((parsed.data.action === "reject" || parsed.data.action === "suspend" || parsed.data.action === "delete") && !parsed.data.reason) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "REASON_REQUIRED", message: "A reason is required for this action." },
        details: { fieldErrors: { reason: "A reason is required for this action." } },
      },
      { status: 400 }
    );
  }

  const result = await applyAdminEmployerAction({
    employerId,
    action: parsed.data.action,
    reason: parsed.data.reason,
  });

  if (result.kind === "not_found") {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Employer not found" } },
      { status: 404 }
    );
  }

  if (result.kind === "blocked") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "DELETE_BLOCKED", message: "Employer deletion is blocked by policy." },
        data: result.deletionPolicy,
      },
      { status: 409 }
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: `admin.employer.${parsed.data.action}`,
    targetType: "employer",
    targetId: employerId,
    metadata: { reason: parsed.data.reason ?? null },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    data: result.kind === "deleted" ? { id: result.employerId, deleted: true } : result.employer,
  });
}