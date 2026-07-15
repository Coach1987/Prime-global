import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "interviews-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "SUPERVISED_INTERVIEW_REQUIRED",
        message: "Legacy interview updates are disabled. Manage interview sessions from the supervised recruitment interview routes.",
      },
    },
    { status: 410 }
  );
}

export async function DELETE(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "interviews-delete", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "SUPERVISED_INTERVIEW_REQUIRED",
        message: "Legacy interview cancellation is disabled. Manage interview sessions from the supervised recruitment interview routes.",
      },
    },
    { status: 410 }
  );
}
