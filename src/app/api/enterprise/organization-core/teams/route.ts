import { NextResponse } from "next/server";
import { createTeamSchema, listByOrganizationQuerySchema } from "@/features/enterprise/schemas";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createTeam, listTeams, requireEnterpriseInternalAccess } from "@/lib/server/enterprise/organization-core";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-teams-list", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const parsedQuery = listByOrganizationQuerySchema.safeParse({ organizationId: url.searchParams.get("organizationId") ?? undefined });
  if (!parsedQuery.success) {
    return NextResponse.json({ success: false, error: { code: "INVALID_QUERY", message: "organizationId is required" } }, { status: 400 });
  }

  try {
    const data = await listTeams(parsedQuery.data.organizationId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_TEAMS_FETCH_FAILED", message: error instanceof Error ? error.message : "Unable to load teams" } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "pgems-teams-create", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireEnterpriseInternalAccess(request);
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseJsonBody(request, createTeamSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createTeam(parsed.data);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "PGEMS_TEAM_CREATE_FAILED", message: error instanceof Error ? error.message : "Unable to create team" } }, { status: 400 });
  }
}
