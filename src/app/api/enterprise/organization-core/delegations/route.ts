import { NextResponse } from "next/server";
import { createDelegationSchema, listByOrganizationQuerySchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createDelegation, listDelegations, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-delegations-list", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const parsedQuery = listByOrganizationQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsedQuery.success) {
    return NextResponse.json({ success: false, error: { code: "INVALID_QUERY", message: "organizationId is required" } }, { status: 400 });
  }

  try {
    const data = await listDelegations(parsedQuery.data.organizationId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_DELEGATIONS_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load delegations" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-delegations-create", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, createDelegationSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createDelegation({
      organizationId: parsed.data.organizationId,
      delegatorEmployeeId: parsed.data.delegatorEmployeeId,
      delegateEmployeeId: parsed.data.delegateEmployeeId,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      status: parsed.data.status ?? "draft",
      notes: parsed.data.notes,
      operationIds: parsed.data.operationIds ?? [],
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_DELEGATION_CREATE_FAILED", message: error instanceof Error ? error.message : "Unable to create delegation" } }, { status: 400 });
  }
}
