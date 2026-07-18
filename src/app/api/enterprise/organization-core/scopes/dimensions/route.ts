import { NextResponse } from "next/server";
import { createScopeDimensionSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createScopeDimension, listScopeDimensions, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-scope-dimensions-list", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await listScopeDimensions();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_SCOPE_DIMENSIONS_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load scope dimensions" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-scope-dimensions-create", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, createScopeDimensionSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createScopeDimension(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_SCOPE_DIMENSION_CREATE_FAILED", message: error instanceof Error ? error.message : "Unable to create scope dimension" } }, { status: 400 });
  }
}
