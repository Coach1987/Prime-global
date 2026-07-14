import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const CANDIDATE_RESUMES_BUCKET = process.env.SUPABASE_CANDIDATE_RESUMES_BUCKET ?? "candidate-resumes";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-applicant-cv-get", 60);
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

  const { applicationId } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: application, error: applicationError } = await supabase
    .from("job_applications_v2")
    .select("id, resume_id, jobs!inner(employer_id)")
    .eq("id", applicationId)
    .eq("jobs.employer_id", employer.id)
    .single();

  if (applicationError || !application?.resume_id) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_NOT_FOUND", message: applicationError?.message ?? "Not found" } },
      { status: 404 }
    );
  }

  const { data: resume, error: resumeError } = await supabase
    .from("candidate_resumes")
    .select("storage_path")
    .eq("id", application.resume_id)
    .single();

  if (resumeError || !resume) {
    return NextResponse.json(
      { success: false, error: { code: "RESUME_NOT_FOUND", message: resumeError?.message ?? "Resume not found" } },
      { status: 404 }
    );
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(CANDIDATE_RESUMES_BUCKET)
    .createSignedUrl(resume.storage_path, 60 * 5);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      { success: false, error: { code: "SIGNED_URL_FAILED", message: signedError?.message ?? "Unable to access CV" } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      url: signed.signedUrl,
      expiresInSeconds: 300,
    },
  });
}
