import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "messages-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "SUPERVISED_MESSAGING_REQUIRED",
        message: "Legacy direct messaging is disabled. Use the supervised recruitment conversation routes under /api/recruitment/conversations.",
      },
    },
    { status: 410 }
  );
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "messages-post", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "SUPERVISED_MESSAGING_REQUIRED",
        message: "Direct private messaging is disabled. Use the supervised recruitment conversation routes under /api/recruitment/conversations.",
      },
    },
    { status: 410 }
  );
}
