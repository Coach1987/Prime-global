import { NextResponse } from "next/server";
import { evaluateGovernanceInputSchema } from "@/features/enterprise/schemas";
import { enforceRateLimit } from "@/lib/server/http";
import { evaluateEmployeeGovernance, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "pgems-governance-evaluate", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const { employeeId } = await params;
  const url = new URL(request.url);
  const parsed = evaluateGovernanceInputSchema.safeParse({
    operationCode: url.searchParams.get("operationCode") ?? undefined,
    permissionCode: url.searchParams.get("permissionCode") ?? undefined,
    scopeNodeId: url.searchParams.get("scopeNodeId") ?? undefined,
    amount: url.searchParams.get("amount") ? Number(url.searchParams.get("amount")) : undefined,
    currencyCode: url.searchParams.get("currencyCode") ?? undefined,
    at: url.searchParams.get("at") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: "INVALID_QUERY", message: "Invalid governance evaluation query" }, details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = await evaluateEmployeeGovernance({
      employeeId,
      operationCode: parsed.data.operationCode,
      permissionCode: parsed.data.permissionCode,
      scopeNodeId: parsed.data.scopeNodeId,
      amount: parsed.data.amount,
      currencyCode: parsed.data.currencyCode,
      atIso: parsed.data.at,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_GOVERNANCE_EVALUATION_FAILED", message: error instanceof Error ? error.message : "Unable to evaluate governance context" } }, { status: 500 });
  }
}
