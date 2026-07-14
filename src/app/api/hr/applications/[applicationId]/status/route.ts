import { NextResponse } from "next/server";
import { updateApplicationStatusSchema } from "@/features/candidates/schemas/candidate";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "hr-application-status", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer && auth.role === "employer") {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const parsed = await parseJsonBody(request, updateApplicationStatusSchema);
  if (parsed.error) return parsed.error;

  const { applicationId } = await params;
  const supabase = createSupabaseAdminClient();

  if (employer) {
    const { data: ownedApplication, error: ownedError } = await supabase
      .from("job_applications_v2")
      .select("id, jobs!inner(employer_id)")
      .eq("id", applicationId)
      .eq("jobs.employer_id", employer.id)
      .maybeSingle();

    if (ownedError || !ownedApplication) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "APPLICATION_NOT_FOUND", message: ownedError?.message ?? "Application not found" },
        },
        { status: 404 }
      );
    }
  }

  const { data, error } = await supabase
    .from("job_applications_v2")
    .update({ status: parsed.data.status })
    .eq("id", applicationId)
    .select("id, status, job_id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "STATUS_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  if (parsed.data.note) {
    await supabase.from("job_application_status_events").insert({
      application_id: applicationId,
      previous_status: null,
      next_status: parsed.data.status,
      changed_by_auth_user_id: auth.userId,
      note: parsed.data.note,
    });
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "hr.application.status.update",
    targetType: "job_application",
    targetId: applicationId,
    metadata: { status: parsed.data.status },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    data: {
      ...data,
      realtimeChannel: `job-application-${applicationId}`,
    },
  });
}
