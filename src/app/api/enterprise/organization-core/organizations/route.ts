import { NextResponse } from "next/server";
import { createOrganizationSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createOrganization, listOrganizations, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-org-list", 100);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await listOrganizations();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_ORGS_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load organizations" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-org-create", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, createOrganizationSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createOrganization(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_ORG_CREATE_FAILED", message: error instanceof Error ? error.message : "Unable to create organization" } }, { status: 400 });
  }
}
