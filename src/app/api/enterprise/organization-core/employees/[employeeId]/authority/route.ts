import { NextResponse } from "next/server";
import { assignEmployeeAuthoritySchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { getEmployeeAuthority, requireEnterpriseInternalAccess, upsertEmployeeAuthority } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-authority-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;

  try {
    const data = await getEmployeeAuthority(employeeId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_AUTHORITY_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load employee authority" } }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-authority-upsert", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, assignEmployeeAuthoritySchema);
  if (parsed.error) return parsed.error;

  const { employeeId } = await params;

  try {
    const data = await upsertEmployeeAuthority({
      employeeId,
      authorityLevelId: parsed.data.authorityLevelId,
      customLevelValue: parsed.data.customLevelValue,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_AUTHORITY_UPSERT_FAILED", message: error instanceof Error ? error.message : "Unable to save employee authority" } }, { status: 400 });
  }
}
