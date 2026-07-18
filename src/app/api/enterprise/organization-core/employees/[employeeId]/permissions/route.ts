import { NextResponse } from "next/server";
import { assignPermissionSchema, evaluatePermissionSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  assignPermissionToEmployee,
  evaluateEmployeePermission,
  loadEmployeePermissionContext,
  requireEnterpriseInternalAccess,
} from "@/lib/server/enterprise/organization-core";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-permissions-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;
  const url = new URL(request.url);
  const permissionCode = url.searchParams.get("permissionCode");

  try {
    if (permissionCode) {
      const validated = evaluatePermissionSchema.safeParse({ permissionCode });
      if (!validated.success) {
        return NextResponse.json({ success: false, error: { code: "INVALID_QUERY", message: "Invalid permissionCode" } }, { status: 400 });
      }

      const decision = await evaluateEmployeePermission(employeeId, validated.data.permissionCode);
      return NextResponse.json({ success: true, data: decision });
    }

    const context = await loadEmployeePermissionContext(employeeId);
    return NextResponse.json({ success: true, data: context });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_PERMISSIONS_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load employee permissions" } }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-permissions-assign", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "deny" ? "deny" : "allow";

  const parsed = await parseJsonBody(request, assignPermissionSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await assignPermissionToEmployee(employeeId, parsed.data.permissionId, mode);
    return NextResponse.json({ success: true, data: { ...data, mode } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_PERMISSION_ASSIGN_FAILED", message: error instanceof Error ? error.message : "Unable to assign employee permission" } }, { status: 400 });
  }
}
