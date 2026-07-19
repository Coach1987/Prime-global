import { NextResponse } from "next/server";
import { bootstrapCorporateGovernanceSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { bootstrapCorporateGovernance, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-governance-bootstrap", 20);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, bootstrapCorporateGovernanceSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await bootstrapCorporateGovernance(parsed.data.organizationId, {
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PGEMS_GOVERNANCE_BOOTSTRAP_FAILED",
          message: error instanceof Error ? error.message : "Unable to bootstrap governance foundation",
        },
      },
      { status: 400 }
    );
  }
}
