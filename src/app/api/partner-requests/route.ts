import { NextResponse } from "next/server";
import { partnerJobRequestReviewSchema, partnerJobRequestSchema } from "@/features/shared/schemas/partner-requests";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "partner-requests-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("partner_job_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: { code: "PARTNER_REQUESTS_LOAD_FAILED", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "partner-requests-post", 24);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, partnerJobRequestSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("partner_job_requests")
    .insert({
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone || null,
      company_website: parsed.data.companyWebsite || null,
      country: parsed.data.country,
      target_hiring_regions: parsed.data.targetHiringRegions,
      job_titles: parsed.data.jobTitles,
      headcount: parsed.data.headcount,
      budget_range: parsed.data.budgetRange || null,
      timeline: parsed.data.timeline || null,
      notes: parsed.data.notes || null,
      source: "public_partner_request",
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: "PARTNER_REQUEST_CREATE_FAILED", message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "partner-requests-patch", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, partnerJobRequestReviewSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("partner_job_requests")
    .update({ status: parsed.data.status, reviewed_at: new Date().toISOString(), assigned_to: auth.userId })
    .eq("id", parsed.data.requestId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: "PARTNER_REQUEST_UPDATE_FAILED", message: error.message } }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}
