import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/security/auth";
import { pickFallbackRecommendedJobs, pickFeaturedJobs, type DiscoveryJobRow } from "@/lib/server/jobs/discovery";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const discoveryQuerySchema = z.object({
  kind: z.enum(["featured", "recommended"]).default("featured"),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

function isAuthContext(value: Awaited<ReturnType<typeof requireAuth>>): value is Exclude<typeof value, NextResponse> {
  return !(value instanceof NextResponse);
}

async function loadPublicJobRows(limit: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, title, status, department, employment_type, country, city, required_skills, responsibilities, requirements, publish_date, employers!inner(id, company_name, verification_status)"
    )
    .eq("status", "published")
    .eq("employers.verification_status", "verified")
    .order("publish_date", { ascending: false, nullsFirst: false })
    .limit(Math.max(24, limit * 4));

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DiscoveryJobRow[];
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "jobs-discovery", 120);
  if (rateLimitResult) return rateLimitResult;

  const url = new URL(request.url);
  const parsed = discoveryQuerySchema.safeParse({
    kind: url.searchParams.get("kind") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_QUERY", message: "Invalid discovery query" } },
      { status: 400 }
    );
  }

  const authResult = await requireAuth(request);
  const auth = isAuthContext(authResult) ? authResult : null;

  try {
    const rows = await loadPublicJobRows(parsed.data.limit);

    if (!auth || auth.role !== "candidate" || parsed.data.kind === "featured") {
      return NextResponse.json({
        success: true,
        section: "featured",
        source: "published_recent",
        data: pickFeaturedJobs(rows, parsed.data.limit),
      });
    }

    const supabase = createSupabaseAdminClient();
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("id, country, city, professional_title")
      .eq("auth_user_id", auth.userId)
      .maybeSingle();

    if (!candidate?.id) {
      return NextResponse.json({
        success: true,
        section: "recommended",
        source: "fallback_recent",
        data: pickFallbackRecommendedJobs(
          rows,
          {
            country: null,
            city: null,
            desiredDepartment: null,
            skills: [],
          },
          parsed.data.limit
        ),
      });
    }

    const [scoresResult, professionalResult] = await Promise.all([
      supabase
        .from("candidate_job_match_scores")
        .select(
          "match_score, computed_at, jobs!inner(id, title, status, department, employment_type, country, city, required_skills, responsibilities, requirements, publish_date, employers!inner(id, company_name, verification_status))"
        )
        .eq("candidate_id", candidate.id)
        .eq("jobs.status", "published")
        .eq("jobs.employers.verification_status", "verified")
        .order("match_score", { ascending: false })
        .order("computed_at", { ascending: false })
        .limit(parsed.data.limit),
      supabase
        .from("candidate_professional_profiles")
        .select("skills")
        .eq("candidate_id", candidate.id)
        .maybeSingle(),
    ]);

    const matchedRows = (scoresResult.data ?? [])
      .map((item) => (Array.isArray(item.jobs) ? item.jobs[0] : item.jobs))
      .filter(Boolean) as DiscoveryJobRow[];

    if (matchedRows.length > 0) {
      return NextResponse.json({
        success: true,
        section: "recommended",
        source: "deterministic_match_scores",
        data: matchedRows.slice(0, parsed.data.limit).map((job) => ({
          id: String(job.id),
          title: job.title,
          country: job.country,
          city: job.city,
          category: job.department,
          specialization: null,
          employment_type: job.employment_type,
          publish_date: job.publish_date,
          summary: (job.responsibilities || job.requirements || "").replace(/\s+/g, " ").slice(0, 180),
          company_display_name: (Array.isArray(job.employers) ? job.employers[0] : job.employers)?.company_name ?? null,
        })),
      });
    }

    const skills = Array.isArray(professionalResult.data?.skills)
      ? (professionalResult.data?.skills as string[])
      : [];

    return NextResponse.json({
      success: true,
      section: "recommended",
      source: "fallback_preferences_recent",
      data: pickFallbackRecommendedJobs(
        rows,
        {
          country: candidate.country ?? null,
          city: candidate.city ?? null,
          desiredDepartment: candidate.professional_title ?? null,
          skills,
        },
        parsed.data.limit
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DISCOVERY_FETCH_FAILED",
          message: error instanceof Error ? error.message : "Unable to load discovery jobs",
        },
      },
      { status: 500 }
    );
  }
}
