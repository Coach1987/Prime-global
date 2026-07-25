import { NextResponse } from "next/server";
import { createApprovalOperationSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createApprovalOperation, listApprovalOperations, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-approval-operations-list", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await listApprovalOperations();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_APPROVAL_OPERATIONS_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load approval operations" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-approval-operations-create", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, createApprovalOperationSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createApprovalOperation(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_APPROVAL_OPERATION_CREATE_FAILED", message: error instanceof Error ? error.message : "Unable to create approval operation" } }, { status: 400 });
  }
}
