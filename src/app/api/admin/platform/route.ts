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

  const roleCheck = requireRole(auth, ["admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();

  const [
    { count: companiesPending },
    { count: companiesVerified },
    { count: activeJobs },
    { count: applicationsCount },
    { count: candidatesCount },
    { data: recentAuditLogs },
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
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      analytics: {
        companiesPending: companiesPending ?? 0,
        companiesVerified: companiesVerified ?? 0,
        activeJobs: activeJobs ?? 0,
        applications: applicationsCount ?? 0,
        candidates: candidatesCount ?? 0,
      },
      reports: {
        generatedAt: new Date().toISOString(),
        recentAuditLogs: recentAuditLogs ?? [],
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

  const roleCheck = requireRole(auth, ["admin", "super_admin"]);
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
