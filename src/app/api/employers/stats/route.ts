import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-stats-get", 90);
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

  const supabase = createSupabaseAdminClient();

  const [{ count: jobsCount }, { count: publishedCount }, { count: applicationsCount }] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("employer_id", employer.id),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", employer.id)
      .eq("status", "published"),
    supabase
      .from("job_applications_v2")
      .select("id, jobs!inner(employer_id)", { count: "exact", head: true })
      .eq("jobs.employer_id", employer.id),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totalJobs: jobsCount ?? 0,
      publishedJobs: publishedCount ?? 0,
      totalApplicants: applicationsCount ?? 0,
      verificationStatus: employer.verification_status,
    },
  });
}
