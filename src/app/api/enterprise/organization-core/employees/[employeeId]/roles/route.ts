import { NextResponse } from "next/server";
import { assignRoleSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { assignRoleToEmployee, loadEmployeePermissionContext, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-roles-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;

  try {
    const data = await loadEmployeePermissionContext(employeeId);
    return NextResponse.json({ success: true, data: { roleIds: data.roleIds } });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_ROLES_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load employee roles" } }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-roles-assign", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;
  const parsed = await parseJsonBody(request, assignRoleSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await assignRoleToEmployee(employeeId, parsed.data.roleId, {
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_ROLE_ASSIGN_FAILED", message: error instanceof Error ? error.message : "Unable to assign role" } }, { status: 400 });
  }
}
