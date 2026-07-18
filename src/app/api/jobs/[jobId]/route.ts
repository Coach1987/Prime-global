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
    .select("id, title, department, employment_type, country, city, publish_date, responsibilities, requirements, employers!inner(id, company_name, verification_status)")
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

  const employer = Array.isArray(data.employers) ? data.employers[0] : data.employers;

  return NextResponse.json({
    success: true,
    data: {
      id: data.id,
      title: data.title,
      country: data.country,
      city: data.city,
      category: data.department,
      specialization: null,
      employment_type: data.employment_type,
      publish_date: data.publish_date,
      description: data.responsibilities,
      requirements: data.requirements,
      company_display_name: employer?.company_name ?? null,
    },
  });
}
