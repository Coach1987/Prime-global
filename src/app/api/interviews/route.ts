import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "interviews-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabaseAdminClient();

  if (auth.role === "employer") {
    const employer = await getEmployerByAuthUserId(auth.userId);
    if (!employer) {
      return NextResponse.json(
        { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("employer_id", employer.id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "INTERVIEWS_LOAD_FAILED", message: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  }

  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", auth.userId)
    .single();

  if (candidateError || !candidate) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: candidateError?.message ?? "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "INTERVIEWS_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "interviews-post", 70);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "SUPERVISED_INTERVIEW_REQUIRED",
        message: "Direct interview creation is disabled. Create interviews from an approved supervised conversation under /api/recruitment/conversations/[conversationId]/interviews.",
      },
    },
    { status: 410 }
  );
}
