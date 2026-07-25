import { NextResponse } from "next/server";
import { assignEmployeeScopeSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { assignEmployeeScope, listEmployeeScopes, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-scopes-list", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;

  try {
    const data = await listEmployeeScopes(employeeId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_SCOPES_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load employee scopes" } }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-scopes-assign", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, assignEmployeeScopeSchema);
  if (parsed.error) return parsed.error;

  const { employeeId } = await params;

  try {
    const data = await assignEmployeeScope(employeeId, parsed.data.scopeNodeId);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_SCOPE_ASSIGN_FAILED", message: error instanceof Error ? error.message : "Unable to assign employee scope" } }, { status: 400 });
  }
}
