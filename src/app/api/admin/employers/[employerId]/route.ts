import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getAdminEmployerById } from "@/lib/server/admin/employers";

const ADMIN_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;
const idSchema = z.string().uuid();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employerId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "admin-employer-get", 120);
  if (rateLimitResult) return rateLimitResult;

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

  const data = await getAdminEmployerById(employerId);
  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Employer not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}