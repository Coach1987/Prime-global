import { createSupabaseAdminClient } from "@/lib/server/supabase";

interface PrivateAccessAuditInput {
  actorAuthUserId?: string;
  actorRole?: string;
  attemptChannel: "api" | "ui" | "storage" | "email" | "other";
  targetType: "original_cv" | "private_document" | "private_profile";
  targetId?: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export async function logBlockedPrivateCandidateAccess(input: PrivateAccessAuditInput) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("candidate_private_access_audit").insert({
      actor_auth_user_id: input.actorAuthUserId ?? null,
      actor_role: input.actorRole ?? null,
      attempt_channel: input.attemptChannel,
      target_type: input.targetType,
      target_id: input.targetId ?? null,
      blocked: true,
      reason: input.reason,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("[privacy-audit] failed to persist private access audit", error);
  }
}
