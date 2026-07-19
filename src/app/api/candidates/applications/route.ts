import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const withdrawSchema = z.object({
  applicationId: z.string().uuid(),
  note: z.string().trim().max(800).optional(),
});

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-applications-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", auth.userId)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Not found" } },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("job_applications_v2")
    .select("*, jobs(*), candidate_profiles!inner(auth_user_id)")
    .eq("candidate_id", candidate.id)
    .order("applied_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATIONS_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  const applicationIds = (data ?? []).map((item) => String(item.id));
  const events = applicationIds.length
    ? await supabase
        .from("job_application_status_events")
        .select("id, application_id, previous_status, next_status, note, created_at")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: false })
    : { data: [] as Array<Record<string, unknown>>, error: null };

  if (events.error) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_STATUS_EVENTS_FETCH_FAILED", message: events.error.message } },
      { status: 500 }
    );
  }

  const eventByApplication = new Map<string, Array<Record<string, unknown>>>();
  for (const event of events.data ?? []) {
    const key = String(event.application_id);
    const current = eventByApplication.get(key) ?? [];
    current.push(event);
    eventByApplication.set(key, current);
  }

  const enriched = (data ?? []).map((application) => ({
    ...application,
    workflowStatus: {
      current: application.status,
      history: eventByApplication.get(String(application.id)) ?? [],
    },
  }));

  return NextResponse.json({ success: true, data: enriched });
}

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-applications-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, withdrawSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", auth.userId)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Not found" } },
      { status: 404 }
    );
  }

  const { data: existingApplication, error: existingApplicationError } = await supabase
    .from("job_applications_v2")
    .select("id, status")
    .eq("id", parsed.data.applicationId)
    .eq("candidate_id", candidate.id)
    .single();

  if (existingApplicationError || !existingApplication) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_NOT_FOUND", message: existingApplicationError?.message ?? "Application not found" } },
      { status: 404 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("job_applications_v2")
    .update({ status: "withdrawn" })
    .eq("id", parsed.data.applicationId)
    .eq("candidate_id", candidate.id)
    .select("id, status, job_id")
    .single();

  if (updateError) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_WITHDRAW_FAILED", message: updateError.message } },
      { status: 400 }
    );
  }

  await supabase.from("job_application_status_events").insert({
    application_id: updated.id,
    previous_status: existingApplication.status,
    next_status: "withdrawn",
    changed_by_auth_user_id: auth.userId,
    note: parsed.data.note ?? "withdrawn_by_candidate",
  });

  await supabase.from("notification_events").insert({
    auth_user_id: auth.userId,
    category: "status_change",
    title: "Application withdrawn",
    body: "Your application has been withdrawn successfully.",
    entity_type: "job_application",
    entity_id: updated.id,
    delivery_channels: ["dashboard", "realtime"],
  });

  return NextResponse.json({ success: true, data: updated });
}
