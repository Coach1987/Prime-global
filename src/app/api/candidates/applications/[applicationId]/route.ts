import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "candidate-application-detail-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const { applicationId } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", auth.userId)
    .single();

  if (candidateError || !candidate?.id) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const { data: application, error: applicationError } = await supabase
    .from("job_applications_v2")
    .select("id, status, applied_at, updated_at, cover_letter, candidate_id, job_id, jobs(id, title, country, city, employment_type, responsibilities, requirements, application_deadline, employers(company_name))")
    .eq("id", applicationId)
    .eq("candidate_id", candidate.id)
    .maybeSingle();

  if (applicationError) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_LOAD_FAILED", message: applicationError.message } },
      { status: 500 }
    );
  }

  if (!application) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_NOT_FOUND", message: "Application not found" } },
      { status: 404 }
    );
  }

  const [{ data: history, error: historyError }, { data: notifications, error: notificationsError }] = await Promise.all([
    supabase
      .from("job_application_status_events")
      .select("id, previous_status, next_status, note, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notification_events")
      .select("id, category, title, body, created_at, is_read")
      .eq("auth_user_id", auth.userId)
      .eq("entity_type", "job_application")
      .eq("entity_id", applicationId)
      .order("created_at", { ascending: false }),
  ]);

  if (historyError) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_HISTORY_LOAD_FAILED", message: historyError.message } },
      { status: 500 }
    );
  }

  if (notificationsError) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_NOTIFICATIONS_LOAD_FAILED", message: notificationsError.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      ...application,
      statusHistory: history ?? [],
      notifications: notifications ?? [],
    },
  });
}
