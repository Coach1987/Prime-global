import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const ENTERPRISE_ALLOWED_ROLES = [
  "employer",
  "prime_global_recruiter",
  "prime_global_admin",
  "admin",
  "super_admin",
] as const;

export async function requireEnterpriseInternalAccess(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...ENTERPRISE_ALLOWED_ROLES]);
  if (roleCheck) return roleCheck;

  return auth;
}
