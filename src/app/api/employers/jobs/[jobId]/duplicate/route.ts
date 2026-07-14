import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit, getRequestContext } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-job-duplicate", 25);
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

  const { jobId } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: sourceJob, error: sourceError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("employer_id", employer.id)
    .single();

  if (sourceError || !sourceJob) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_NOT_FOUND", message: sourceError?.message ?? "Job not found" } },
      { status: 404 }
    );
  }

  const cloned = { ...sourceJob };
  delete cloned.id;
  delete cloned.created_at;
  delete cloned.updated_at;

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      ...cloned,
      status: "draft",
      publish_date: null,
      title: `${sourceJob.title} (Copy)`,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_DUPLICATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.job.duplicate",
    targetType: "job",
    targetId: data.id,
    metadata: { sourceJobId: jobId },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
