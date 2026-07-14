import { NextResponse } from "next/server";
import { updateInterviewSchema } from "@/features/employers/schemas/interview";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "interviews-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, updateInterviewSchema);
  if (parsed.error) return parsed.error;

  const { interviewId } = await params;
  const supabase = createSupabaseAdminClient();
  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("interviews")
    .update({
      scheduled_at: parsed.data.scheduledAt,
      interview_type: parsed.data.interviewType,
      duration_minutes: parsed.data.durationMinutes,
      location_or_link: parsed.data.locationOrLink,
      notes: parsed.data.notes,
      status: parsed.data.status,
    })
    .eq("id", interviewId)
    .eq("employer_id", employer.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "INTERVIEW_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ interviewId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "interviews-delete", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const { interviewId } = await params;
  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("interviews")
    .update({ status: "cancelled" })
    .eq("id", interviewId)
    .eq("employer_id", employer.id);

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "INTERVIEW_CANCEL_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { id: interviewId, status: "cancelled" } });
}
