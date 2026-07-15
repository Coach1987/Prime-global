import { NextResponse } from "next/server";
import {
  recruitmentConversationRequestSchema,
} from "@/features/recruitment/schemas/supervised";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createConversationRequestForEmployer, listConversationRequestsForActor, toHttpError } from "@/lib/server/recruitment/service";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

const RECRUITMENT_ROLES = ["candidate", "employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversation-requests-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, [...RECRUITMENT_ROLES]);
  if (roleCheck) return roleCheck;

  const locale = new URL(request.url).searchParams.get("locale") === "ar" ? "ar" : "en";

  try {
    const data = await listConversationRequestsForActor(auth, locale);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to load conversation requests");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_REQUESTS_LOAD_FAILED", message: normalized.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "recruitment-conversation-requests-post", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, recruitmentConversationRequestSchema);
  if (parsed.error) return parsed.error;

  try {
    const data = await createConversationRequestForEmployer(auth, {
      candidateId: parsed.data.candidateId,
      relatedJobId: parsed.data.relatedJobId ?? null,
      relatedApplicationId: parsed.data.relatedApplicationId ?? null,
      requestedMessage: parsed.data.requestedMessage,
      locale: parsed.data.locale ?? "en",
    });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const normalized = toHttpError(error, "Unable to create conversation request");
    if (normalized instanceof NextResponse) return normalized;
    return NextResponse.json({ success: false, error: { code: "RECRUITMENT_REQUEST_CREATE_FAILED", message: normalized.message } }, { status: 400 });
  }
}