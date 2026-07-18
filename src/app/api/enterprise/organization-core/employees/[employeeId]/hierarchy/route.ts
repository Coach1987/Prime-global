import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { buildEmployeeHierarchy, listEmployees, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";
import { listByOrganizationQuerySchema } from "@/features/enterprise/schemas";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-hierarchy", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const parsedQuery = listByOrganizationQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsedQuery.success) {
    return NextResponse.json({ success: false, error: { code: "INVALID_QUERY", message: "organizationId is required" } }, { status: 400 });
  }

  const { employeeId } = await params;

  try {
    const employees = await listEmployees(parsedQuery.data.organizationId);
    const nodes = employees.map((employee) => ({
      id: String(employee.id),
      managerEmployeeId: employee.manager_employee_id ? String(employee.manager_employee_id) : null,
    }));

    const data = buildEmployeeHierarchy(nodes, employeeId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_HIERARCHY_FAILED", message: error instanceof Error ? error.message : "Unable to build employee hierarchy" } }, { status: 500 });
  }
}
