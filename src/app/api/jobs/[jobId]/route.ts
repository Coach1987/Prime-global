import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "job-public-detail", 120);
  if (rateLimitResult) return rateLimitResult;

  const { jobId } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, department, employment_type, work_mode, country, city, salary_min, salary_max, salary_currency, experience, education, required_skills, responsibilities, requirements, benefits, application_deadline, publish_date, employers!inner(id, company_name, industry, verification_status)")
    .eq("id", jobId)
    .eq("status", "published")
    .eq("employers.verification_status", "verified")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_DETAIL_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_NOT_FOUND", message: "Job not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}
