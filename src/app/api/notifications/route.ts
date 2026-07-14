import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const markReadSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "notification-center-get", 150);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .eq("auth_user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "NOTIFICATION_CENTER_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "notification-center-post", 100);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, markReadSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_events")
    .update({ is_read: true })
    .eq("id", parsed.data.id)
    .eq("auth_user_id", auth.userId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "NOTIFICATION_CENTER_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}
