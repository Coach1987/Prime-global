import { NextResponse } from "next/server";
import { listPublicJobsQuerySchema } from "@/features/jobs/schemas/job";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "jobs-public-list", 180);
  if (rateLimitResult) return rateLimitResult;

  const url = new URL(request.url);
  const query = listPublicJobsQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    city: url.searchParams.get("city") ?? undefined,
    industry: url.searchParams.get("industry") ?? undefined,
    employmentType: url.searchParams.get("employmentType") ?? undefined,
    workMode: url.searchParams.get("workMode") ?? undefined,
    minSalary: url.searchParams.get("minSalary") ?? undefined,
    experience: url.searchParams.get("experience") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!query.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_QUERY", message: "Invalid query parameters" } },
      { status: 400 }
    );
  }

  const input = query.data;
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;

  const supabase = createSupabaseAdminClient();
  let dbQuery = supabase
    .from("jobs")
    .select("id, title, department, employment_type, work_mode, country, city, salary_min, salary_max, salary_currency, experience, education, required_skills, application_deadline, publish_date, employers!inner(company_name, industry, verification_status)", {
      count: "exact",
    })
    .eq("status", "published")
    .eq("employers.verification_status", "verified")
    .range(from, to);

  if (input.country) dbQuery = dbQuery.ilike("country", input.country);
  if (input.city) dbQuery = dbQuery.ilike("city", input.city);
  if (input.employmentType) dbQuery = dbQuery.eq("employment_type", input.employmentType);
  if (input.workMode) dbQuery = dbQuery.eq("work_mode", input.workMode);
  if (input.minSalary !== undefined) dbQuery = dbQuery.gte("salary_max", input.minSalary);
  if (input.experience) dbQuery = dbQuery.ilike("experience", `%${input.experience}%`);
  if (input.industry) dbQuery = dbQuery.ilike("employers.industry", `%${input.industry}%`);
  if (input.q) dbQuery = dbQuery.or(`title.ilike.%${input.q}%,department.ilike.%${input.q}%`);

  if (input.sort === "highest_salary") {
    dbQuery = dbQuery.order("salary_max", { ascending: false, nullsFirst: false });
  } else {
    dbQuery = dbQuery.order("publish_date", { ascending: false, nullsFirst: false });
  }

  const { data, count, error } = await dbQuery;
  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOBS_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalItems: count ?? 0,
      totalPages: count ? Math.ceil(count / input.pageSize) : 0,
    },
  });
}
