import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createAuditLog } from "@/lib/server/security/audit";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function POST(request: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const rateLimitResult = enforceRateLimit(request, "employer-candidate-profile-interview-request", 30);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const { candidateId } = await params;
  const { searchParams } = new URL(request.url);
  const note = searchParams.get("note")?.trim() ?? null;
  const locale = searchParams.get("locale") === "ar" ? "ar" : "en";
  const supabase = createSupabaseAdminClient();

  const { data: candidateProfile, error: profileError } = await supabase
    .from("candidate_public_profiles")
    .select("candidate_id, profile_status")
    .eq("candidate_id", candidateId)
    .eq("profile_status", "approved")
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILE_LOAD_FAILED", message: profileError.message } },
      { status: 500 }
    );
  }

  if (!candidateProfile) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILE_NOT_APPROVED", message: "Candidate profile is not approved for supervised contact" } },
      { status: 400 }
    );
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id, auth_user_id")
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError || !candidate?.auth_user_id) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const { data: existingConversation } = await supabase
    .from("recruitment_conversations")
    .select("id")
    .eq("employer_id", employer.id)
    .eq("candidate_id", candidateId)
    .in("status", ["pending_candidate_acceptance", "active", "paused"])
    .maybeSingle();

  if (existingConversation) {
    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "recruitment.interview_interest.recorded",
      targetType: "recruitment_conversation",
      targetId: existingConversation.id,
      metadata: { employerId: employer.id, note },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          candidateId,
          conversationId: existingConversation.id,
          status: "conversation_exists",
          message:
            locale === "ar"
              ? "المحادثة الخاضعة للإشراف موجودة بالفعل. اطلب المقابلة من داخل المحادثة."
              : "A supervised conversation already exists. Request the interview from inside the conversation.",
        },
      },
      { status: 202 }
    );
  }

  const { data, error } = await supabase
    .from("recruitment_conversation_requests")
    .insert({
      employer_id: employer.id,
      employer_auth_user_id: auth.userId,
      candidate_id: candidateId,
      candidate_auth_user_id: candidate.auth_user_id,
      requested_message:
        note ??
        (locale === "ar"
          ? "يرجى فتح محادثة خاضعة للإشراف تمهيدًا لطلب مقابلة عبر برايم جلوبال."
          : "Please open a supervised conversation in preparation for requesting an interview through Prime Global."),
      status: "pending_prime_global_assignment",
    })
    .select("id, status")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "RECRUITMENT_REQUEST_CREATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "recruitment.conversation_request.created_from_legacy_interview_entrypoint",
    targetType: "recruitment_conversation_request",
    targetId: data.id,
    metadata: {
      employerId: employer.id,
      candidateId,
      note,
    },
  });

  return NextResponse.json({ success: true, data: { candidateId, requestId: data.id, status: data.status } }, { status: 202 });
}
