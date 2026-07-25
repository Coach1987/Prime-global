import { NextResponse } from "next/server";
import { upsertGovernanceControlsSchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireEnterpriseInternalAccess, upsertGovernanceControls } from "@/lib/server/enterprise/organization-core";

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-governance-controls-upsert", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, upsertGovernanceControlsSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await upsertGovernanceControls(parsed.data, {
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
          code: "PGEMS_GOVERNANCE_CONTROLS_UPSERT_FAILED",
          message: error instanceof Error ? error.message : "Unable to configure governance controls",
        },
      },
      { status: 400 }
    );
  }
}
