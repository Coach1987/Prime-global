import { NextResponse } from "next/server";
import { listPublicJobsQuerySchema } from "@/features/jobs/schemas/job";
import { enforceRateLimit } from "@/lib/server/http";
import {
  buildSafeSummary,
  escapeLikeValue,
  filterAndRankPublicJobs,
  type PublicJobSearchRow,
} from "@/lib/server/jobs/public-search";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "jobs-public-list", 180);
  if (rateLimitResult) return rateLimitResult;

  const url = new URL(request.url);
  const query = listPublicJobsQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    keyword: url.searchParams.get("keyword") ?? undefined,
    profession: url.searchParams.get("profession") ?? undefined,
    specialization: url.searchParams.get("specialization") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    skill: url.searchParams.get("skill") ?? undefined,
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

  const supabase = createSupabaseAdminClient();

  const qSeed = [input.q, input.keyword, input.profession, input.specialization, input.category, input.skill]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ")
    .trim();

  let dbQuery = supabase
    .from("jobs")
    .select("id, status, title, department, employment_type, work_mode, country, city, salary_min, salary_max, salary_currency, experience, education, required_skills, responsibilities, requirements, application_deadline, publish_date, employers!inner(id, company_name, industry, verification_status)", {
      count: "exact",
    })
    .eq("status", "published")
    .eq("employers.verification_status", "verified")
    .order("publish_date", { ascending: false, nullsFirst: false })
    .range(0, 999);

  if (input.country) dbQuery = dbQuery.ilike("country", `%${escapeLikeValue(input.country)}%`);
  if (input.city) dbQuery = dbQuery.ilike("city", `%${escapeLikeValue(input.city)}%`);
  if (input.employmentType) dbQuery = dbQuery.eq("employment_type", input.employmentType);
  if (input.workMode) dbQuery = dbQuery.eq("work_mode", input.workMode);
  if (input.minSalary !== undefined) dbQuery = dbQuery.gte("salary_max", input.minSalary);
  if (input.experience) dbQuery = dbQuery.ilike("experience", `%${escapeLikeValue(input.experience)}%`);
  if (input.industry) dbQuery = dbQuery.ilike("employers.industry", `%${escapeLikeValue(input.industry)}%`);
  if (qSeed) {
    const escapedSeed = escapeLikeValue(qSeed);
    dbQuery = dbQuery.or(
      `title.ilike.%${escapedSeed}%,department.ilike.%${escapedSeed}%,responsibilities.ilike.%${escapedSeed}%,requirements.ilike.%${escapedSeed}%`
    );
  }

  const { data, count, error } = await dbQuery;
  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOBS_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  const ranked = filterAndRankPublicJobs((data ?? []) as PublicJobSearchRow[], {
    q: input.q,
    keyword: input.keyword,
    profession: input.profession,
    specialization: input.specialization,
    category: input.category,
    skill: input.skill,
    country: input.country,
    city: input.city,
    employmentType: input.employmentType,
    workMode: input.workMode,
  });

  if (input.sort === "highest_salary") {
    ranked.sort((left, right) => {
      const rightSalary = right.row.salary_max ?? -1;
      const leftSalary = left.row.salary_max ?? -1;
      if (rightSalary !== leftSalary) return rightSalary - leftSalary;
      if (right.score !== left.score) return right.score - left.score;
      return String(left.row.id).localeCompare(String(right.row.id));
    });
  }

  const paged = ranked.slice(from, from + input.pageSize);

  const employerIds = Array.from(new Set(paged.map((item) => {
    const employer = Array.isArray(item.row.employers) ? item.row.employers[0] : item.row.employers;
    return employer?.id;
  }).filter((id): id is string => Boolean(id))));

  const { data: trustScores } = employerIds.length
    ? await supabase.from("prime_trust_scores").select("employer_id, verification_score, trust_badge, completion_rate").in("employer_id", employerIds)
    : { data: [] };

  const trustScoreMap = new Map((trustScores ?? []).map((score) => [score.employer_id, score]));

  return NextResponse.json({
    success: true,
    data: paged.map((item) => {
      const job = item.row;
      const employer = Array.isArray(job.employers) ? job.employers[0] : job.employers;
      return {
        id: job.id,
        title: job.title,
        country: job.country,
        city: job.city,
        department: job.department,
        employment_type: job.employment_type,
        work_mode: job.work_mode,
        required_skills: job.required_skills ?? [],
        publish_date: job.publish_date,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_currency: job.salary_currency,
        summary: buildSafeSummary(job),
        company_display_name: employer?.company_name ?? null,
        rank_score: item.score,
        employerTrustScore: employer?.id ? trustScoreMap.get(employer.id) ?? null : null,
      };
    }),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      totalItems: ranked.length,
      totalPages: ranked.length ? Math.ceil(ranked.length / input.pageSize) : 0,
      baseTotalItems: count ?? 0,
    },
  });
}
