import { NextResponse } from "next/server";
import { createOfferSchema } from "@/features/employers/schemas/offers";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "offers-get", 120);
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
      .from("job_offers")
      .select("*")
      .eq("employer_id", employer.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "OFFERS_LOAD_FAILED", message: error.message } },
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
    .from("job_offers")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "OFFERS_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "offers-post", 70);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, createOfferSchema);
  if (parsed.error) return parsed.error;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: application, error: applicationError } = await supabase
    .from("job_applications_v2")
    .select("id, candidate_id, jobs!inner(employer_id)")
    .eq("id", parsed.data.applicationId)
    .eq("jobs.employer_id", employer.id)
    .single();

  if (applicationError || !application) {
    return NextResponse.json(
      { success: false, error: { code: "APPLICATION_NOT_FOUND", message: applicationError?.message ?? "Application missing" } },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("job_offers")
    .insert({
      application_id: parsed.data.applicationId,
      employer_id: employer.id,
      candidate_id: application.candidate_id,
      title: parsed.data.title,
      compensation: parsed.data.compensation ?? null,
      currency: parsed.data.currency,
      start_date: parsed.data.startDate ?? null,
      terms: parsed.data.terms ?? null,
      status: "sent",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "OFFER_CREATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
