import { NextResponse } from "next/server";
import { globalSearchQuerySchema } from "@/features/shared/schemas/search";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "global-search", 150);
  if (rateLimitResult) return rateLimitResult;

  const url = new URL(request.url);
  const parsed = globalSearchQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    skill: url.searchParams.get("skill") ?? undefined,
    job: url.searchParams.get("job") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    company: url.searchParams.get("company") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    experience: url.searchParams.get("experience") ?? undefined,
    education: url.searchParams.get("education") ?? undefined,
    salaryMin: url.searchParams.get("salaryMin") ?? undefined,
    visa: url.searchParams.get("visa") ?? undefined,
    nationality: url.searchParams.get("nationality") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_SEARCH_QUERY", message: "Invalid search query" } },
      { status: 400 }
    );
  }

  const query = parsed.data;
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;

  const supabase = createSupabaseAdminClient();

  let jobsQuery = supabase
    .from("jobs")
    .select("id, title, country, city, employment_type, work_mode, experience, education, salary_min, salary_max, employers!inner(id, company_name, industry)", { count: "exact" })
    .eq("status", "published")
    .range(from, to)
    .order("publish_date", { ascending: false, nullsFirst: false });

  if (query.q) jobsQuery = jobsQuery.or(`title.ilike.%${query.q}%,department.ilike.%${query.q}%`);
  if (query.job) jobsQuery = jobsQuery.ilike("title", `%${query.job}%`);
  if (query.country) jobsQuery = jobsQuery.ilike("country", `%${query.country}%`);
  if (query.experience) jobsQuery = jobsQuery.ilike("experience", `%${query.experience}%`);
  if (query.education) jobsQuery = jobsQuery.ilike("education", `%${query.education}%`);
  if (query.salaryMin !== undefined) jobsQuery = jobsQuery.gte("salary_max", query.salaryMin);
  if (query.company) jobsQuery = jobsQuery.ilike("employers.company_name", `%${query.company}%`);

  const [jobsResult, employersResult, candidatesResult] = await Promise.all([
    jobsQuery,
    supabase
      .from("employers")
      .select("id, company_name, industry, country, city, verification_status")
      .ilike("company_name", `%${query.company ?? query.q ?? ""}%`)
      .limit(20),
    supabase
      .from("candidate_public_profiles")
      .select("candidate_id, candidate_reference, professional_title, professional_summary, years_of_experience, skills, employment_history, education, certifications, languages, general_location, availability, desired_role, expected_salary, ai_summary, profile_status, generated_at")
      .eq("profile_status", "approved")
      .limit(50),
  ]);

  if (jobsResult.error || employersResult.error || candidatesResult.error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SEARCH_FAILED",
          message:
            jobsResult.error?.message ??
            employersResult.error?.message ??
            candidatesResult.error?.message ??
            "Search failed",
        },
      },
      { status: 500 }
    );
  }

  const candidateResults = (candidatesResult.data ?? []).filter((item) => {
    const skills = (item.skills ?? []).map((entry: unknown) => String(entry).toLowerCase());
    const languages = (item.languages ?? []).map((entry: unknown) => String(entry).toLowerCase());
    const location = String(item.general_location ?? "").toLowerCase();
    const expectedSalary = Number(item.expected_salary ?? 0);

    if (query.skill && !skills.some((value: string) => value.includes(query.skill!.toLowerCase()))) return false;
    if (query.language && !languages.some((value: string) => value.includes(query.language!.toLowerCase()))) return false;
    if (query.country && !location.includes(query.country.toLowerCase())) return false;
    if (query.salaryMin !== undefined && expectedSalary < query.salaryMin) return false;

    return true;
  });

  return NextResponse.json({
    success: true,
    data: {
      jobs: jobsResult.data ?? [],
      employers: employersResult.data ?? [],
      candidates: candidateResults,
    },
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: jobsResult.count ?? 0,
      totalPages: jobsResult.count ? Math.ceil(jobsResult.count / query.pageSize) : 0,
    },
  });
}
