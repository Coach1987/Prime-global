import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId, requireVerifiedEmployerStatus } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-workflow-get", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const verificationGate = requireVerifiedEmployerStatus(employer.verification_status as string | null | undefined);
  if (verificationGate) return verificationGate;

  const supabase = createSupabaseAdminClient();
  const { data: applications, error: applicationsError } = await supabase
    .from("job_applications_v2")
    .select("id, status, applied_at, updated_at, candidate_id, job_id, jobs!inner(id, employer_id, title), candidate_public_profiles(candidate_id, candidate_reference, professional_title)")
    .eq("jobs.employer_id", employer.id)
    .order("applied_at", { ascending: false })
    .limit(300);

  if (applicationsError) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATIONS_LOAD_FAILED", message: applicationsError.message } },
      { status: 500 }
    );
  }

  const applicationIds = (applications ?? []).map((item) => String(item.id));
  const eventsResult = applicationIds.length
    ? await supabase
        .from("job_application_status_events")
        .select("id, application_id, previous_status, next_status, note, created_at")
        .in("application_id", applicationIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (eventsResult.error) {
    return NextResponse.json(
      { success: false, error: { code: "WORKFLOW_EVENTS_LOAD_FAILED", message: eventsResult.error.message } },
      { status: 500 }
    );
  }

  const eventByApplication = new Map<string, Array<Record<string, unknown>>>();
  for (const event of eventsResult.data ?? []) {
    const key = String(event.application_id);
    const current = eventByApplication.get(key) ?? [];
    current.push(event as unknown as Record<string, unknown>);
    eventByApplication.set(key, current);
  }

  const data = (applications ?? []).map((application) => {
    const candidatePublic = Array.isArray(application.candidate_public_profiles)
      ? application.candidate_public_profiles[0]
      : application.candidate_public_profiles;
    const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;

    return {
      applicationId: application.id,
      currentStage: application.status,
      appliedAt: application.applied_at,
      updatedAt: application.updated_at,
      job: {
        id: job?.id,
        title: job?.title,
      },
      candidate: {
        id: application.candidate_id,
        reference: candidatePublic?.candidate_reference ?? "PG Candidate",
        title: candidatePublic?.professional_title ?? null,
      },
      workflowHistory: eventByApplication.get(String(application.id)) ?? [],
    };
  });

  return NextResponse.json({ success: true, data });
}
