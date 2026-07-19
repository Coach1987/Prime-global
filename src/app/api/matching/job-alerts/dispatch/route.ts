import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import {
  getJobAlertThreshold,
  scoreJobForCandidateAlerts,
  type CandidateAlertProfile,
  type PublishedJobProfile,
} from "@/lib/server/matching/job-alerts";
import { sendTransactionalEmail } from "@/lib/server/email/service";
import { buildJobAlertEmail } from "@/lib/server/email/templates/job-alert";
import { createAuditLog } from "@/lib/server/security/audit";
import { serverEnv } from "@/lib/server/config/env";

function buildBaseUrl() {
  return (serverEnv.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function createUnsubscribeToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "job-alert-dispatch-post", 30);
  if (rateLimitResult) return rateLimitResult;

  const authHeader = request.headers.get("authorization") ?? "";
  const isBearerAuth = authHeader.toLowerCase().startsWith("bearer ");
  if (!isBearerAuth) {
    const csrfResult = enforceCsrf(request);
    if (csrfResult) return csrfResult;
  }

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const defaultThreshold = getJobAlertThreshold();

  const [{ data: jobs, error: jobsError }, { data: candidates, error: candidatesError }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, requirements, required_skills, experience, country, city, work_mode, status, employers!inner(company_name, verification_status)")
      .eq("status", "published")
      .order("publish_date", { ascending: false })
      .limit(50),
    supabase
      .from("candidate_profiles")
      .select("id, auth_user_id, email, settings, country, city, candidate_job_alert_preferences(*)")
      .limit(300),
  ]);

  if (jobsError || candidatesError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "JOB_ALERT_DISPATCH_LOAD_FAILED",
          message: jobsError?.message ?? candidatesError?.message ?? "Unable to load alert data",
        },
      },
      { status: 500 }
    );
  }

  const baseUrl = buildBaseUrl();
  let dispatched = 0;

  for (const rawCandidate of candidates ?? []) {
    if (!rawCandidate.auth_user_id || !rawCandidate.email) continue;

    const preferenceRow = Array.isArray(rawCandidate.candidate_job_alert_preferences)
      ? rawCandidate.candidate_job_alert_preferences[0]
      : rawCandidate.candidate_job_alert_preferences;

    const frequency = String(preferenceRow?.email_notification_frequency ?? "instant");
    if (frequency === "disabled" || Boolean(preferenceRow?.unsubscribed)) continue;

    const settings = (rawCandidate.settings ?? {}) as Record<string, unknown>;
    const locale = String(settings.locale ?? "en") === "ar" ? "ar" : "en";

    const candidateProfile: CandidateAlertProfile = {
      candidateId: String(rawCandidate.id),
      authUserId: String(rawCandidate.auth_user_id),
      email: String(rawCandidate.email),
      locale,
      desiredJobTitles: Array.isArray(preferenceRow?.desired_job_titles)
        ? preferenceRow.desired_job_titles
        : Array.isArray(settings.desiredJobTitles)
          ? (settings.desiredJobTitles as string[])
          : [],
      relatedJobTitles: Array.isArray(preferenceRow?.related_job_titles)
        ? preferenceRow.related_job_titles
        : [],
      skills: Array.isArray(preferenceRow?.skills)
        ? preferenceRow.skills
        : Array.isArray(settings.skills)
          ? (settings.skills as string[])
          : [],
      experienceLevel: (preferenceRow?.experience_level as string | null) ?? null,
      industry: (preferenceRow?.industry as string | null) ?? null,
      country: (preferenceRow?.country as string | null) ?? (rawCandidate.country as string | null) ?? null,
      city: (preferenceRow?.city as string | null) ?? (rawCandidate.city as string | null) ?? null,
      workModePreference: (preferenceRow?.work_mode_preference as CandidateAlertProfile["workModePreference"]) ?? "any",
      languages: Array.isArray(preferenceRow?.languages)
        ? preferenceRow.languages
        : Array.isArray(settings.languages)
          ? (settings.languages as string[])
          : [],
      availability: (preferenceRow?.availability as string | null) ?? null,
      notificationThreshold: Number(preferenceRow?.notification_threshold ?? defaultThreshold),
    };

    for (const rawJob of jobs ?? []) {
      const employer = Array.isArray(rawJob.employers) ? rawJob.employers[0] : rawJob.employers;
      const jobProfile: PublishedJobProfile = {
        id: String(rawJob.id),
        title: String(rawJob.title),
        companyDisplayName:
          employer?.verification_status === "verified"
            ? String(employer.company_name ?? "Prime Global Verified Employer")
            : "Prime Global Employer",
        shortSummary: String(rawJob.requirements ?? "Professional opportunity managed by Prime Global"),
        requiredSkills: Array.isArray(rawJob.required_skills) ? rawJob.required_skills : [],
        experience: String(rawJob.experience ?? ""),
        country: String(rawJob.country ?? ""),
        city: String(rawJob.city ?? ""),
        workMode: String(rawJob.work_mode ?? "onsite") as PublishedJobProfile["workMode"],
        languages: [],
      };

      const scoring = scoreJobForCandidateAlerts(candidateProfile, jobProfile);
      const threshold = Number.isFinite(candidateProfile.notificationThreshold)
        ? Number(candidateProfile.notificationThreshold)
        : defaultThreshold;

      if (scoring.matchScore < threshold) continue;

      const { data: existing } = await supabase
        .from("candidate_job_alert_events")
        .select("id")
        .eq("matched_job_id", jobProfile.id)
        .eq("candidate_id", candidateProfile.candidateId)
        .maybeSingle();
      if (existing?.id) continue;

      const { data: alertRow, error: insertError } = await supabase
        .from("candidate_job_alert_events")
        .insert({
          matched_job_id: jobProfile.id,
          candidate_id: candidateProfile.candidateId,
          match_score: scoring.matchScore,
          match_reasons: scoring.reasons,
          notification_status: "pending",
          email_status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !alertRow) continue;

      await supabase.from("notification_events").insert({
        auth_user_id: candidateProfile.authUserId,
        category: "message",
        title:
          locale === "ar"
            ? `فرصة جديدة: ${jobProfile.title}`
            : `New opportunity: ${jobProfile.title}`,
        body:
          locale === "ar"
            ? `توافق ${Math.round(scoring.matchScore)}% — ${jobProfile.companyDisplayName}`
            : `${Math.round(scoring.matchScore)}% match — ${jobProfile.companyDisplayName}`,
        entity_type: "job",
        entity_id: jobProfile.id,
        delivery_channels: ["dashboard", "realtime"],
      });

      const unsubscribeToken = createUnsubscribeToken();
      await supabase.from("email_unsubscribe_tokens").insert({
        auth_user_id: candidateProfile.authUserId,
        email: candidateProfile.email,
        token: unsubscribeToken,
        scope: "job_alerts",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const secureJobUrl = `${baseUrl}/${locale}/jobs/${jobProfile.id}`;
      const unsubscribeUrl = `${baseUrl}/${locale}/candidate/job-alert-unsubscribe?token=${unsubscribeToken}`;
      const email = buildJobAlertEmail({
        locale,
        candidateName: undefined,
        jobTitle: jobProfile.title,
        companyDisplayName: jobProfile.companyDisplayName,
        generalLocation: [jobProfile.city, jobProfile.country].filter(Boolean).join(", "),
        shortSummary: jobProfile.shortSummary.slice(0, 280),
        matchReason: scoring.reasons.slice(0, 3).join(", ") || "Profile alignment",
        secureJobUrl,
        unsubscribeUrl,
      });

      const emailResult = await sendTransactionalEmail({
        idempotencyKey: `job-alert:${alertRow.id}`,
        authUserId: candidateProfile.authUserId,
        recipientEmail: candidateProfile.email,
        templateKey: "job-alert",
        subject: email.subject,
        html: email.html,
        metadata: {
          candidateId: candidateProfile.candidateId,
          jobId: jobProfile.id,
          alertId: alertRow.id,
        },
      });

      await supabase
        .from("candidate_job_alert_events")
        .update({
          notification_status: "sent",
          email_status: emailResult.status === "sent" ? "sent" : emailResult.status,
          sent_at: new Date().toISOString(),
        })
        .eq("id", alertRow.id);

      dispatched += 1;
    }
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "job_alerts.dispatch.executed",
    targetType: "candidate_job_alert_events",
    metadata: { dispatched },
  });

  return NextResponse.json({ success: true, data: { dispatched } });
}
