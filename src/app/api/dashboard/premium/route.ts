import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "premium-dashboard-get", 90);
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
  const [{ count: applicationsCount }, { count: interviewsCount }, { count: acceptedCount }, { count: rejectedCount }, { data: funnel }] = await Promise.all([
    supabase
      .from("job_applications_v2")
      .select("id, jobs!inner(employer_id)", { count: "exact", head: true })
      .eq("jobs.employer_id", employer.id),
    supabase
      .from("interviews")
      .select("id", { count: "exact", head: true })
      .eq("employer_id", employer.id),
    supabase
      .from("job_applications_v2")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .in("job_id", (await supabase.from("jobs").select("id").eq("employer_id", employer.id)).data?.map((job) => job.id) ?? []),
    supabase
      .from("job_applications_v2")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected")
      .in("job_id", (await supabase.from("jobs").select("id").eq("employer_id", employer.id)).data?.map((job) => job.id) ?? []),
    supabase.from("hiring_funnel_metrics").select("*").eq("employer_id", employer.id).maybeSingle(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      applications: applicationsCount ?? 0,
      interviews: interviewsCount ?? 0,
      accepted: acceptedCount ?? 0,
      rejected: rejectedCount ?? 0,
      funnel: funnel ?? null,
      timeToHire: funnel?.[0]?.time_to_hire_days ?? null,
      generatedAt: new Date().toISOString(),
    },
  });
}
