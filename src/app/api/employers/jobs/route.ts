import { NextResponse } from "next/server";
import { createJobSchema } from "@/features/jobs/schemas/job";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-jobs-get", 120);
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
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: { code: "JOBS_LOAD_FAILED", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-jobs-create", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, createJobSchema);
  if (parsed.error) return parsed.error;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  if (parsed.data.status === "published" && employer.verification_status !== "verified") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EMPLOYER_NOT_VERIFIED",
          message: "Company must be verified before publishing jobs",
        },
      },
      { status: 403 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      employer_id: employer.id,
      title: parsed.data.title,
      department: parsed.data.department,
      employment_type: parsed.data.employmentType,
      work_mode: parsed.data.workMode,
      country: parsed.data.country,
      city: parsed.data.city,
      salary_min: parsed.data.salaryMin ?? null,
      salary_max: parsed.data.salaryMax ?? null,
      salary_currency: parsed.data.salaryCurrency,
      experience: parsed.data.experience,
      education: parsed.data.education,
      required_skills: parsed.data.requiredSkills,
      responsibilities: parsed.data.responsibilities,
      requirements: parsed.data.requirements,
      benefits: parsed.data.benefits ?? null,
      application_deadline: parsed.data.applicationDeadline ?? null,
      status: parsed.data.status,
      publish_date: parsed.data.status === "published" ? parsed.data.publishDate ?? nowIso : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_CREATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.job.create",
    targetType: "job",
    targetId: data.id,
    metadata: { title: data.title, status: data.status },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
