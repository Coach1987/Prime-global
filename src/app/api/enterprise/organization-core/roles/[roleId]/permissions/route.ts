import { NextResponse } from "next/server";
import { assignPermissionSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import {
  assignPermissionToRole,
  listRolePermissions,
  requireEnterpriseInternalAccess,
} from "@/lib/server/enterprise/organization-core";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "pgems-role-permissions-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { roleId } = await params;

  try {
    const data = await listRolePermissions(roleId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_ROLE_PERMISSIONS_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load role permissions" } }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "pgems-role-permissions-assign", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { roleId } = await params;
  const parsed = await parseJsonBody(request, assignPermissionSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await assignPermissionToRole(roleId, parsed.data.permissionId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_ROLE_PERMISSION_ASSIGN_FAILED", message: error instanceof Error ? error.message : "Unable to assign role permission" } }, { status: 400 });
  }
}
