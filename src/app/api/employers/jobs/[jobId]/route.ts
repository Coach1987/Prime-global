import { NextResponse } from "next/server";
import { updateJobSchema } from "@/features/jobs/schemas/job";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { evaluateAgencyPolicy, evaluateJobContactPolicy } from "@/lib/server/employer-policy";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-job-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const { jobId } = await params;
  const parsed = await parseJsonBody(request, updateJobSchema);
  if (parsed.error) return parsed.error;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: employerProfile, error: employerProfileError } = await supabase
    .from("employers")
    .select("company_name, industry, company_description")
    .eq("id", employer.id)
    .maybeSingle();

  if (employerProfileError || !employerProfile) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EMPLOYER_POLICY_CONTEXT_MISSING",
          message: employerProfileError?.message ?? "Employer policy context missing",
        },
      },
      { status: 404 }
    );
  }

  const agencyViolation = evaluateAgencyPolicy({
    companyName: employerProfile.company_name,
    industry: employerProfile.industry,
    companyDescription: employerProfile.company_description,
  });

  if (agencyViolation) {
    return NextResponse.json(
      {
        success: false,
        error: { code: agencyViolation.code, message: agencyViolation.message },
        details: {
          messageAr: agencyViolation.messageAr,
          fieldErrors: agencyViolation.fieldErrors,
          localizedFieldErrors: agencyViolation.localizedFieldErrors,
        },
      },
      { status: 403 }
    );
  }

  const contactViolation = evaluateJobContactPolicy({
    title: parsed.data.title,
    department: parsed.data.department,
    responsibilities: parsed.data.responsibilities,
    requirements: parsed.data.requirements,
    benefits: parsed.data.benefits,
    requiredSkills: parsed.data.requiredSkills,
  });

  if (contactViolation) {
    return NextResponse.json(
      {
        success: false,
        error: { code: contactViolation.code, message: contactViolation.message },
        details: {
          messageAr: contactViolation.messageAr,
          fieldErrors: contactViolation.fieldErrors,
          localizedFieldErrors: contactViolation.localizedFieldErrors,
        },
      },
      { status: 400 }
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

  const nowIso = new Date().toISOString();

  const dbPayload = {
    title: parsed.data.title,
    department: parsed.data.department,
    employment_type: parsed.data.employmentType,
    work_mode: parsed.data.workMode,
    country: parsed.data.country,
    city: parsed.data.city,
    salary_min: parsed.data.salaryMin,
    salary_max: parsed.data.salaryMax,
    salary_currency: parsed.data.salaryCurrency,
    experience: parsed.data.experience,
    education: parsed.data.education,
    required_skills: parsed.data.requiredSkills,
    responsibilities: parsed.data.responsibilities,
    requirements: parsed.data.requirements,
    benefits: parsed.data.benefits,
    application_deadline: parsed.data.applicationDeadline,
    status: parsed.data.status,
    publish_date:
      parsed.data.status === "published" ? (parsed.data.publishDate ?? nowIso) : undefined,
  };

  const { data, error } = await supabase
    .from("jobs")
    .update(dbPayload)
    .eq("id", jobId)
    .eq("employer_id", employer.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.job.update",
    targetType: "job",
    targetId: jobId,
    metadata: { changedFields: Object.keys(parsed.data) },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "employer-job-delete", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

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

  const { jobId } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("jobs").delete().eq("id", jobId).eq("employer_id", employer.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_DELETE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.job.delete",
    targetType: "job",
    targetId: jobId,
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data: { id: jobId } });
}
