import { NextResponse } from "next/server";
import { applyToJobSchema } from "@/features/jobs/schemas/job";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "job-apply", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const { jobId } = await params;
  const parsed = await parseJsonBody(request, applyToJobSchema);
  if (parsed.error) return parsed.error;

  if (parsed.data.jobId !== jobId) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_ID_MISMATCH", message: "Route jobId does not match payload" } },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", auth.userId)
    .maybeSingle();

  if (candidateError || !candidate) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, employer_id, status")
    .eq("id", jobId)
    .eq("status", "published")
    .single();

  if (jobError || !job) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_NOT_AVAILABLE", message: jobError?.message ?? "Job not available" } },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("job_applications_v2")
    .insert({
      job_id: job.id,
      candidate_id: candidate.id,
      resume_id: parsed.data.resumeId ?? null,
      cover_letter: parsed.data.coverLetter ?? null,
      status: "new",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_CREATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "candidate.job.apply",
    targetType: "job_application",
    targetId: data.id,
    metadata: { jobId },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
