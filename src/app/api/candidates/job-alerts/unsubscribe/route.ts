import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { createAuditLog } from "@/lib/server/security/audit";

const unsubscribeSchema = z.object({
  token: z.string().trim().min(20).max(300),
});

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-job-alert-unsubscribe-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const parsed = await parseJsonBody(request, unsubscribeSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data: tokenRow, error: tokenError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("id, auth_user_id, email, expires_at, used_at")
    .eq("token", parsed.data.token)
    .eq("scope", "job_alerts")
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return NextResponse.json(
      { success: false, error: { code: "UNSUBSCRIBE_TOKEN_INVALID", message: "Invalid unsubscribe token" } },
      { status: 400 }
    );
  }

  if (tokenRow.used_at || new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { success: false, error: { code: "UNSUBSCRIBE_TOKEN_EXPIRED", message: "Unsubscribe token is no longer valid" } },
      { status: 400 }
    );
  }

  if (tokenRow.auth_user_id) {
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("id")
      .eq("auth_user_id", tokenRow.auth_user_id)
      .maybeSingle();

    if (candidate?.id) {
      await supabase
        .from("candidate_job_alert_preferences")
        .upsert(
          {
            candidate_id: candidate.id,
            email_notification_frequency: "disabled",
            unsubscribed: true,
          },
          { onConflict: "candidate_id" }
        );
    }
  }

  await supabase
    .from("email_unsubscribe_tokens")
    .update({ used_at: nowIso })
    .eq("id", tokenRow.id);

  await createAuditLog({
    actorAuthUserId: tokenRow.auth_user_id ?? undefined,
    actorRole: "candidate",
    action: "candidate.job_alerts.unsubscribed",
    targetType: "email_unsubscribe_tokens",
    targetId: tokenRow.id,
  });

  return NextResponse.json({ success: true, data: { unsubscribed: true } });
}
