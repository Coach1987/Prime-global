import { NextResponse } from "next/server";
import { createScopeNodeSchema, listByOrganizationQuerySchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createScopeNode, listScopeNodes, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-scope-nodes-list", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const parsedQuery = listByOrganizationQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsedQuery.success) {
    return NextResponse.json({ success: false, error: { code: "INVALID_QUERY", message: "organizationId is required" } }, { status: 400 });
  }

  try {
    const data = await listScopeNodes(parsedQuery.data.organizationId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_SCOPE_NODES_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load scope nodes" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-scope-nodes-create", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, createScopeNodeSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createScopeNode(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_SCOPE_NODE_CREATE_FAILED", message: error instanceof Error ? error.message : "Unable to create scope node" } }, { status: 400 });
  }
}
