import { createSupabaseAdminClient } from "@/lib/server/supabase";

interface AuditLogInput {
  actorAuthUserId?: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(input: AuditLogInput) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("audit_logs").insert({
      actor_auth_user_id: input.actorAuthUserId ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to persist audit log", error);
  }
}
