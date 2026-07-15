import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { listConversationsForActor, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversations-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const data = await listConversationsForActor(auth, locale);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load conversations");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_CONVERSATIONS_LOAD_FAILED", message: normalized.message } }, { status: 500 });
  }
}