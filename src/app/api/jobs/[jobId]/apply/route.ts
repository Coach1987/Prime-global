import { NextResponse } from "next/server";
import { applyToJobSchema } from "@/features/jobs/schemas/job";
import { evaluateCandidateProfileCompletion } from "@/lib/server/candidates/profile-completion";
import { DEFAULT_LOCALE, isLocale } from "@/lib/constants/locales";
import { evaluateApplicationEligibility } from "@/lib/server/jobs/application-eligibility";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

async function loadApplicationContext({
  userId,
  jobId,
}: {
  userId: string;
  jobId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const candidateId = candidate?.id ? String(candidate.id) : null;

  const [{ data: job, error: jobError }, profileCompletion, { data: primaryResume }, { data: duplicateApplication }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, status, application_deadline")
        .eq("id", jobId)
        .maybeSingle(),
      candidateId
        ? evaluateCandidateProfileCompletion(userId)
        : Promise.resolve(null),
      candidateId
        ? supabase
            .from("candidate_resumes")
            .select("id")
            .eq("candidate_id", candidateId)
            .eq("is_primary", true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      candidateId
        ? supabase
            .from("job_applications_v2")
            .select("id")
            .eq("job_id", jobId)
            .eq("candidate_id", candidateId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  return {
    supabase,
    candidateId,
    candidateFound: Boolean(candidateId) && !candidateError,
    job,
    jobError,
    profileCompletion,
    primaryResumeId: primaryResume?.id ? String(primaryResume.id) : null,
    duplicateApplicationId: duplicateApplication?.id ? String(duplicateApplication.id) : null,
  };
}

function toLocalizedRoleMessage(locale: string) {
  if (locale === "ar") {
    return "التقديم على الوظائف متاح فقط عبر حساب مرشح.";
  }
  return "Job applications require a Candidate account.";
}

function resolveLocaleFromRequest(request: Request) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  if (localeParam && isLocale(localeParam)) return localeParam;
  return DEFAULT_LOCALE;
}

function resolveReturnToFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("returnTo");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "job-apply-status", 80);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const locale = resolveLocaleFromRequest(request);
  const returnTo = resolveReturnToFromRequest(request);
  const { jobId } = await params;
  const context = await loadApplicationContext({ userId: auth.userId, jobId });

  const decision = evaluateApplicationEligibility({
    role: auth.role,
    candidateFound: context.candidateFound,
    jobFound: Boolean(context.job),
    jobStatus: context.job?.status ?? null,
    jobApplicationDeadline: context.job?.application_deadline ?? null,
    profileCompletion: context.profileCompletion,
    duplicateApplicationId: context.duplicateApplicationId,
    locale,
    returnTo,
  });

  if (decision.code === "ROLE_NOT_ELIGIBLE") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ROLE_NOT_ELIGIBLE",
          message: toLocalizedRoleMessage(locale),
        },
      },
      { status: 403 }
    );
  }

  if (decision.code === "JOB_NOT_AVAILABLE") {
    return NextResponse.json(
      { success: false, error: { code: "JOB_NOT_AVAILABLE", message: "Job not available" } },
      { status: 404 }
    );
  }

  if (decision.code === "JOB_NOT_ACTIVE") {
    return NextResponse.json(
      { success: false, error: { code: "JOB_NOT_ACTIVE", message: "Job is not active for applications" } },
      { status: 409 }
    );
  }

  if (decision.code === "CANDIDATE_NOT_FOUND") {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      code: decision.code,
      eligible: decision.eligible,
      onboardingRedirect: decision.onboardingRedirect,
      duplicateApplicationId: decision.duplicateApplicationId,
      profileCompletionPercent: decision.profileCompletionPercent,
      missingRequirements: decision.missingRequirements,
      cvReady: decision.cvReady,
      documentsReady: decision.documentsReady,
      primaryResumeId: context.primaryResumeId,
      job: context.job
        ? {
            id: context.job.id,
            title: context.job.title,
          }
        : null,
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "job-apply", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const locale = resolveLocaleFromRequest(request);
  const returnTo = resolveReturnToFromRequest(request);

  const { jobId } = await params;
  const parsed = await parseJsonBody(request, applyToJobSchema);
  if (parsed.error) return parsed.error;

  if (parsed.data.jobId !== jobId) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_ID_MISMATCH", message: "Route jobId does not match payload" } },
      { status: 400 }
    );
  }

  const context = await loadApplicationContext({ userId: auth.userId, jobId });
  const decision = evaluateApplicationEligibility({
    role: auth.role,
    candidateFound: context.candidateFound,
    jobFound: Boolean(context.job),
    jobStatus: context.job?.status ?? null,
    jobApplicationDeadline: context.job?.application_deadline ?? null,
    profileCompletion: context.profileCompletion,
    duplicateApplicationId: context.duplicateApplicationId,
    locale,
    returnTo,
  });

  if (decision.code === "ROLE_NOT_ELIGIBLE") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ROLE_NOT_ELIGIBLE",
          message: toLocalizedRoleMessage(locale),
        },
      },
      { status: 403 }
    );
  }

  if (decision.code === "JOB_NOT_AVAILABLE") {
    return NextResponse.json(
      { success: false, error: { code: "JOB_NOT_AVAILABLE", message: "Job not available" } },
      { status: 404 }
    );
  }

  if (decision.code === "JOB_NOT_ACTIVE") {
    return NextResponse.json(
      { success: false, error: { code: "JOB_NOT_ACTIVE", message: "Job is not active for applications" } },
      { status: 409 }
    );
  }

  if (decision.code === "CANDIDATE_NOT_FOUND") {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  if (decision.code === "DUPLICATE_APPLICATION") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DUPLICATE_APPLICATION",
          message: "Application already exists for this job.",
        },
      },
      { status: 409 }
    );
  }

  if (decision.code === "CANDIDATE_PROFILE_INCOMPLETE") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CANDIDATE_PROFILE_INCOMPLETE",
          message: "Complete onboarding requirements before applying.",
        },
        data: {
          onboardingRedirect: decision.onboardingRedirect,
          missingRequirements: decision.missingRequirements,
          profileCompletionPercent: decision.profileCompletionPercent,
          cvReady: decision.cvReady,
          documentsReady: decision.documentsReady,
        },
      },
      { status: 409 }
    );
  }

  if (!context.candidateId) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const supabase = context.supabase;

  if (parsed.data.resumeId) {
    const { data: selectedResume } = await supabase
      .from("candidate_resumes")
      .select("id")
      .eq("id", parsed.data.resumeId)
      .eq("candidate_id", context.candidateId)
      .maybeSingle();

    if (!selectedResume) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESUME_NOT_ALLOWED",
            message: "Selected resume does not belong to the authenticated candidate.",
          },
        },
        { status: 400 }
      );
    }
  }

  const resumeId = parsed.data.resumeId ?? context.primaryResumeId ?? null;

  const { data, error } = await supabase
    .from("job_applications_v2")
    .insert({
      job_id: context.job!.id,
      candidate_id: context.candidateId,
      resume_id: resumeId,
      cover_letter: parsed.data.coverLetter ?? null,
      status: "new",
    })
    .select("id, job_id, status, applied_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_APPLICATION",
            message: "Application already exists for this job.",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_CREATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "candidate.job.apply",
    targetType: "job_application",
    targetId: data.id,
    metadata: { jobId, resumeId },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
