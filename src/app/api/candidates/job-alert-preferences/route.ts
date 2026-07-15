import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";

const preferenceSchema = z.object({
  desiredJobTitles: z.array(z.string().trim().min(1).max(140)).max(20).default([]),
  relatedJobTitles: z.array(z.string().trim().min(1).max(140)).max(30).default([]),
  skills: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  experienceLevel: z.string().trim().max(80).optional().nullable(),
  industry: z.string().trim().max(80).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  workModePreference: z.enum(["remote", "hybrid", "onsite", "any"]).default("any"),
  languages: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  availability: z.string().trim().max(120).optional().nullable(),
  emailNotificationFrequency: z.enum(["instant", "daily", "weekly", "disabled"]).default("instant"),
  notificationThreshold: z.number().min(0).max(100).default(70),
  unsubscribed: z.boolean().default(false),
});

async function loadCandidateId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Candidate profile missing");
  }

  return data.id as string;
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-job-alert-preferences-get", 100);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  try {
    const candidateId = await loadCandidateId(auth.userId);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("candidate_job_alert_preferences")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "JOB_ALERT_PREFERENCES_FETCH_FAILED", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CANDIDATE_PROFILE_MISSING", message: error instanceof Error ? error.message : "Candidate profile missing" },
      },
      { status: 404 }
    );
  }
}

export async function PUT(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-job-alert-preferences-put", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, preferenceSchema);
  if (parsed.error) return parsed.error;

  try {
    const candidateId = await loadCandidateId(auth.userId);
    const supabase = createSupabaseAdminClient();

    const payload = {
      candidate_id: candidateId,
      desired_job_titles: parsed.data.desiredJobTitles,
      related_job_titles: parsed.data.relatedJobTitles,
      skills: parsed.data.skills,
      experience_level: parsed.data.experienceLevel ?? null,
      industry: parsed.data.industry ?? null,
      country: parsed.data.country ?? null,
      city: parsed.data.city ?? null,
      work_mode_preference: parsed.data.workModePreference,
      languages: parsed.data.languages,
      availability: parsed.data.availability ?? null,
      email_notification_frequency: parsed.data.emailNotificationFrequency,
      notification_threshold: parsed.data.notificationThreshold,
      unsubscribed: parsed.data.unsubscribed,
    };

    const { data, error } = await supabase
      .from("candidate_job_alert_preferences")
      .upsert(payload, { onConflict: "candidate_id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "JOB_ALERT_PREFERENCES_SAVE_FAILED", message: error.message } },
        { status: 400 }
      );
    }

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "candidate.job_alert_preferences.updated",
      targetType: "candidate_job_alert_preferences",
      targetId: candidateId,
      metadata: {
        emailNotificationFrequency: parsed.data.emailNotificationFrequency,
        notificationThreshold: parsed.data.notificationThreshold,
        unsubscribed: parsed.data.unsubscribed,
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CANDIDATE_PROFILE_MISSING", message: error instanceof Error ? error.message : "Candidate profile missing" },
      },
      { status: 404 }
    );
  }
}
