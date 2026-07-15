import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { getStaffRecruitmentOverview, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-staff-overview-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const data = await getStaffRecruitmentOverview(auth, locale);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load staff recruitment overview");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_STAFF_OVERVIEW_FAILED", message: normalized.message } }, { status: 500 });
  }
}