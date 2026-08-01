import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, getRequestContext, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const adminActionSchema = z.object({
  action: z.enum([
    "approve_company",
    "reject_company",
    "suspend_company",
    "delete_job",
    "manage_candidate",
    "manage_employer",
  ]),
  targetId: z.string().uuid(),
  note: z.string().trim().max(1200).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-platform-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfTodayUtc = new Date(startOfTodayUtc);
  endOfTodayUtc.setUTCDate(endOfTodayUtc.getUTCDate() + 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const [
    { count: companiesPending },
    { count: companiesVerified },
    { count: activeJobs },
    { count: applicationsCount },
    { count: candidatesCount },
    { count: pendingAdvertisements },
    { count: pendingJobs },
    { count: pendingCandidateAiReviews },
    { count: interviewsToday },
    { count: criticalAlertsCount },
    { count: unreadNotificationsCount },
    { count: moderationQueueCount },
    { count: pendingConversationRequests },
    { data: recruitmentConversations },
    { data: recentAuditLogsRaw },
    { data: recentNotificationsRaw },
    { data: recentCriticalCasesRaw },
    { data: recentAuditSeriesRaw },
    { data: recruitmentAuditSeriesRaw },
  ] = await Promise.all([
    supabase
      .from("employers")
      .select("id", { head: true, count: "exact" })
      .in("verification_status", ["pending", "documents_submitted", "admin_review"]),
    supabase
      .from("employers")
      .select("id", { head: true, count: "exact" })
      .eq("verification_status", "verified"),
    supabase.from("jobs").select("id", { head: true, count: "exact" }).eq("status", "published"),
    supabase.from("job_applications_v2").select("id", { head: true, count: "exact" }),
    supabase.from("candidate_profiles").select("id", { head: true, count: "exact" }),
    supabase.from("advertisements").select("id", { head: true, count: "exact" }).eq("status", "pending_review"),
    supabase.from("jobs").select("id", { head: true, count: "exact" }).eq("status", "draft"),
    supabase.from("candidate_public_profiles").select("candidate_id", { head: true, count: "exact" }).eq("profile_status", "pending_review"),
    supabase
      .from("recruitment_interviews")
      .select("id", { head: true, count: "exact" })
      .gte("scheduled_at", startOfTodayUtc.toISOString())
      .lt("scheduled_at", endOfTodayUtc.toISOString()),
    supabase
      .from("candidate_document_verification_cases")
      .select("id", { head: true, count: "exact" })
      .eq("priority", "critical")
      .in("status", ["pending_manual_review", "live_verification_required", "escalated"]),
    supabase.from("notifications").select("id", { head: true, count: "exact" }).eq("is_read", false),
    supabase
      .from("recruitment_messages")
      .select("id", { head: true, count: "exact" })
      .eq("moderation_state", "requires_review"),
    supabase
      .from("recruitment_conversation_requests")
      .select("id", { head: true, count: "exact" })
      .in("status", ["pending_prime_global_assignment", "pending_staff_review"]),
    supabase
      .from("recruitment_conversations")
      .select("id, assigned_staff_id, conversation_mode, status")
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("audit_logs")
      .select("id, actor_auth_user_id, actor_role, action, target_type, target_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("notifications")
      .select("id, category, title, body, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("candidate_document_verification_cases")
      .select("id, candidate_id, status, priority, updated_at")
      .eq("priority", "critical")
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("audit_logs")
      .select("id, created_at")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("audit_logs")
      .select("id, action, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .ilike("action", "recruitment.%")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const recentAuditLogs = recentAuditLogsRaw ?? [];
  const employerTargetIds = Array.from(
    new Set(
      recentAuditLogs
        .filter((entry) => String(entry.target_type ?? "") === "employer")
        .map((entry) => String(entry.target_id ?? ""))
        .filter(Boolean)
    )
  );

  const { data: employerTargets } = employerTargetIds.length
    ? await supabase.from("employers").select("id, company_name").in("id", employerTargetIds)
    : { data: [] as Array<{ id: string; company_name: string }> };

  const employerNameById = new Map((employerTargets ?? []).map((row) => [String(row.id), String(row.company_name ?? "")]))
  ;

  const conversations = recruitmentConversations ?? [];
  const assignedStaffSet = new Set(
    conversations.map((item) => String(item.assigned_staff_id ?? "")).filter(Boolean)
  );
  const aiQueueCount = conversations.filter((item) => {
    const mode = String(item.conversation_mode ?? "");
    return mode === "ai_supervised" || mode === "awaiting_staff";
  }).length;

  const weeklyBucket = new Map<string, number>();
  for (let index = 0; index < 7; index += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (6 - index)));
    weeklyBucket.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of recentAuditSeriesRaw ?? []) {
    const key = String(row.created_at ?? "").slice(0, 10);
    if (weeklyBucket.has(key)) {
      weeklyBucket.set(key, (weeklyBucket.get(key) ?? 0) + 1);
    }
  }

  const monthlyBucket = new Map<string, number>();
  for (let index = 0; index < 6; index += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    monthlyBucket.set(d.toISOString().slice(0, 7), 0);
  }
  for (const row of recentAuditLogs) {
    const monthKey = String(row.created_at ?? "").slice(0, 7);
    if (monthlyBucket.has(monthKey)) {
      monthlyBucket.set(monthKey, (monthlyBucket.get(monthKey) ?? 0) + 1);
    }
  }
  if (sixMonthsAgo.getTime() > 0) {
    for (const row of recruitmentAuditSeriesRaw ?? []) {
      const monthKey = String(row.created_at ?? "").slice(0, 7);
      if (monthlyBucket.has(monthKey)) {
        monthlyBucket.set(monthKey, (monthlyBucket.get(monthKey) ?? 0) + 1);
      }
    }
  }

  const recruitmentKpiCounts = {
    requestsApproved: 0,
    requestsRejected: 0,
    interviewsStarted: 0,
    aiAssists: 0,
  };
  for (const row of recruitmentAuditSeriesRaw ?? []) {
    const action = String(row.action ?? "");
    if (action === "recruitment.conversation_request.approved") recruitmentKpiCounts.requestsApproved += 1;
    if (action === "recruitment.conversation_request.rejected") recruitmentKpiCounts.requestsRejected += 1;
    if (action === "recruitment.interview.started") recruitmentKpiCounts.interviewsStarted += 1;
    if (action === "recruitment.ai_supervisor.assist") recruitmentKpiCounts.aiAssists += 1;
  }

  function asSafeRecord(input: unknown) {
    return input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  }

  function inferAuditTargetLabel(entry: Record<string, unknown>) {
    const targetType = String(entry.target_type ?? "");
    const targetId = String(entry.target_id ?? "");
    if (targetType === "employer" && employerNameById.has(targetId)) {
      return employerNameById.get(targetId) ?? targetId;
    }
    if (!targetId) return targetType || "target";
    return targetId;
  }

  const recentAuditLogsFormatted = recentAuditLogs.map((entry) => {
    const metadata = asSafeRecord(entry.metadata);
    return {
      id: String(entry.id ?? ""),
      action: String(entry.action ?? ""),
      actorRole: String(entry.actor_role ?? ""),
      targetType: String(entry.target_type ?? ""),
      targetId: String(entry.target_id ?? ""),
      targetLabel: inferAuditTargetLabel(entry as Record<string, unknown>),
      reason: typeof metadata.reason === "string" ? metadata.reason : null,
      createdAt: String(entry.created_at ?? ""),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      analytics: {
        companiesPending: companiesPending ?? 0,
        companiesVerified: companiesVerified ?? 0,
        activeJobs: activeJobs ?? 0,
        applications: applicationsCount ?? 0,
        candidates: candidatesCount ?? 0,
        pendingAdvertisements: pendingAdvertisements ?? 0,
        pendingJobs: pendingJobs ?? 0,
        pendingCandidateAiReviews: pendingCandidateAiReviews ?? 0,
        interviewsToday: interviewsToday ?? 0,
        criticalAlerts: criticalAlertsCount ?? 0,
        systemNotifications: unreadNotificationsCount ?? 0,
      },
      executive: {
        pendingCompanies: companiesPending ?? 0,
        pendingAdvertisements: pendingAdvertisements ?? 0,
        pendingJobs: pendingJobs ?? 0,
        pendingCandidateAiReviews: pendingCandidateAiReviews ?? 0,
        interviewsToday: interviewsToday ?? 0,
        criticalAlerts: criticalAlertsCount ?? 0,
        systemNotifications: unreadNotificationsCount ?? 0,
        moderationQueue: moderationQueueCount ?? 0,
        pendingConversationRequests: pendingConversationRequests ?? 0,
        recruitersAssigned: assignedStaffSet.size,
        aiQueue: aiQueueCount,
      },
      analyticsSeries: {
        weeklyActivity: Array.from(weeklyBucket.entries()).map(([date, value]) => ({ date, value })),
        monthlyReports: Array.from(monthlyBucket.entries()).map(([month, value]) => ({ month, value })),
        recruitmentKpis: recruitmentKpiCounts,
        aiStatistics: {
          pendingManualReview: pendingCandidateAiReviews ?? 0,
          criticalCases: criticalAlertsCount ?? 0,
          aiQueue: aiQueueCount,
        },
        businessOverview: {
          companiesVerified: companiesVerified ?? 0,
          activeJobs: activeJobs ?? 0,
          applications: applicationsCount ?? 0,
          candidates: candidatesCount ?? 0,
        },
      },
      reports: {
        generatedAt: new Date().toISOString(),
        recentAuditLogs: recentAuditLogsFormatted,
        recentImportantActivities: recentAuditLogsFormatted.slice(0, 12),
        recentCriticalCases: (recentCriticalCasesRaw ?? []).map((item) => ({
          id: String(item.id ?? ""),
          candidateId: String(item.candidate_id ?? ""),
          status: String(item.status ?? ""),
          priority: String(item.priority ?? ""),
          updatedAt: String(item.updated_at ?? ""),
        })),
        systemNotifications: (recentNotificationsRaw ?? []).map((item) => ({
          id: String(item.id ?? ""),
          category: String(item.category ?? ""),
          title: String(item.title ?? ""),
          body: String(item.body ?? ""),
          isRead: Boolean(item.is_read),
          createdAt: String(item.created_at ?? ""),
        })),
      },
    },
  });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "admin-platform-post", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, adminActionSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const { action, targetId, note, payload } = parsed.data;

  if (action === "approve_company") {
    await supabase
      .from("employers")
      .update({ verification_status: "verified", verification_notes: note ?? null, verified_at: new Date().toISOString() })
      .eq("id", targetId);
  }

  if (action === "reject_company") {
    await supabase
      .from("employers")
      .update({ verification_status: "rejected", verification_notes: note ?? null })
      .eq("id", targetId);
  }

  if (action === "suspend_company") {
    await supabase
      .from("employers")
      .update({ verification_status: "suspended", verification_notes: note ?? null })
      .eq("id", targetId);
  }

  if (action === "delete_job") {
    await supabase.from("jobs").delete().eq("id", targetId);
  }

  if (action === "manage_candidate") {
    const nextSettings = payload ?? {};
    await supabase.from("candidate_profiles").update({ settings: nextSettings }).eq("id", targetId);
  }

  if (action === "manage_employer") {
    const allowedKeys = ["industry", "company_size", "verification_notes"];
    const patch = Object.fromEntries(
      Object.entries(payload ?? {}).filter(([key]) => allowedKeys.includes(key))
    );

    if (Object.keys(patch).length > 0) {
      await supabase.from("employers").update(patch).eq("id", targetId);
    }
  }

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: `admin.${action}`,
    targetType: action,
    targetId,
    metadata: { note, payload },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data: { action, targetId } });
}
