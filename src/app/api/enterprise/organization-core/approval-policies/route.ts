import { NextResponse } from "next/server";
import { createApprovalPolicySchema, listByOrganizationQuerySchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createApprovalPolicy, listApprovalPolicies, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-approval-policies-list", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const parsedQuery = listByOrganizationQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsedQuery.success) {
    return NextResponse.json({ success: false, error: { code: "INVALID_QUERY", message: "organizationId is required" } }, { status: 400 });
  }

  try {
    const data = await listApprovalPolicies(parsedQuery.data.organizationId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_APPROVAL_POLICIES_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load approval policies" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-approval-policies-create", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, createApprovalPolicySchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createApprovalPolicy({
      organizationId: parsed.data.organizationId,
      operationId: parsed.data.operationId,
      minAuthorityLevel: parsed.data.minAuthorityLevel,
      requiredPermissionId: parsed.data.requiredPermissionId,
      scopeRequired: parsed.data.scopeRequired ?? false,
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_APPROVAL_POLICY_CREATE_FAILED", message: error instanceof Error ? error.message : "Unable to create approval policy" } }, { status: 400 });
  }
}
