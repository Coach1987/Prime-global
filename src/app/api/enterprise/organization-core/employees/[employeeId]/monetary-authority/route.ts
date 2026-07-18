import { NextResponse } from "next/server";
import { upsertEmployeeMonetaryAuthoritySchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { getEmployeeMonetaryAuthority, requireEnterpriseInternalAccess, upsertEmployeeMonetaryAuthority } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-monetary-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;

  try {
    const data = await getEmployeeMonetaryAuthority(employeeId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_MONETARY_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load monetary authority" } }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-employee-monetary-upsert", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, upsertEmployeeMonetaryAuthoritySchema);
  if (parsed.error) return parsed.error;

  const { employeeId } = await params;

  try {
    const data = await upsertEmployeeMonetaryAuthority({
      employeeId,
      currencyCode: parsed.data.currencyCode,
      maximumApprovalAmount: parsed.data.maximumApprovalAmount,
      isUnlimited: parsed.data.isUnlimited ?? false,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_EMPLOYEE_MONETARY_UPSERT_FAILED", message: error instanceof Error ? error.message : "Unable to save monetary authority" } }, { status: 400 });
  }
}
