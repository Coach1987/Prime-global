import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/http";
import {
  getStaffRecruitmentEvents,
  type StaffRecruitmentEventQuery,
  toHttpError,
} from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const PRIME_GLOBAL_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

const querySchema = z.object({
  search: z.string().trim().max(120).optional(),
  actionPrefix: z.string().trim().max(120).optional(),
  targetType: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-staff-events-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, [...PRIME_GLOBAL_ROLES]);
  if (roleCheck) return roleCheck;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    search: url.searchParams.get("search") ?? undefined,
    actionPrefix: url.searchParams.get("actionPrefix") ?? undefined,
    targetType: url.searchParams.get("targetType") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_QUERY", message: "Invalid query parameters" } },
      { status: 400 }
    );
  }

  const query = parsed.data satisfies StaffRecruitmentEventQuery;

  try {
    const data = await getStaffRecruitmentEvents(auth, query);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load recruitment events");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json(
      {
        success: false,
        error: { code: "RECRUITMENT_STAFF_EVENTS_FAILED", message: normalized.message },
      },
      { status: 500 }
    );
  }
}
