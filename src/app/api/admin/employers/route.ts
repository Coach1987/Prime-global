import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { listAdminEmployers } from "@/lib/server/admin/employers";

const ADMIN_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-employers-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...ADMIN_ROLES]);
  if (roleCheck) return roleCheck;

  const url = new URL(request.url);
  const data = await listAdminEmployers({
    query: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "all",
  });

  return NextResponse.json({ success: true, data });
}