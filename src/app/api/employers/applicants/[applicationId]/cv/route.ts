import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createAuditLog } from "@/lib/server/security/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-applicant-cv-get", 60);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const { applicationId } = await params;

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.blocked_original_cv_access",
    targetType: "job_application",
    targetId: applicationId,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Employer access to original CVs is not permitted. Use the anonymized candidate profile endpoint.",
      },
    },
    { status: 403 }
  );
}
