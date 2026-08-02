import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId, normalizeEmployerAccountStatus } from "@/lib/server/employers";
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
    return NextResponse.json({
      success: true,
      data: {
        totalJobs: 0,
        publishedJobs: 0,
        totalApplicants: 0,
        totalAdvertisements: 0,
        verificationStatus: "not_submitted",
        accountStatus: "pending_review",
      },
    });
  }

  const supabase = createSupabaseAdminClient();

  const [jobsResult, publishedResult, applicationsResult, advertisementsResult] = await Promise.all([
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
    supabase.from("advertisements").select("id", { count: "exact", head: true }).eq("created_by", auth.userId),
  ]);

  const jobsCount = jobsResult.error ? 0 : (jobsResult.count ?? 0);
  const publishedCount = publishedResult.error ? 0 : (publishedResult.count ?? 0);
  const applicationsCount = applicationsResult.error ? 0 : (applicationsResult.count ?? 0);
  const advertisementsCount = advertisementsResult.error ? 0 : (advertisementsResult.count ?? 0);

  return NextResponse.json({
    success: true,
    data: {
      totalJobs: jobsCount,
      publishedJobs: publishedCount,
      totalApplicants: applicationsCount,
      totalAdvertisements: advertisementsCount,
      verificationStatus: employer.verification_status,
      accountStatus: normalizeEmployerAccountStatus(employer.verification_status),
    },
  });
}
