import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import {
  EMPLOYER_CANDIDATE_PROFILE_SELECT,
  sanitizeEmployerCandidateProfiles,
} from "@/lib/server/candidates/employer-profile";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-candidate-profiles-get", 90);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  if (auth.role === "employer") {
    const employer = await getEmployerByAuthUserId(auth.userId);
    if (!employer) {
      return NextResponse.json(
        { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
        { status: 404 }
      );
    }
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("candidate_public_profiles_employer_view")
    .select(EMPLOYER_CANDIDATE_PROFILE_SELECT)
    .order("generated_at", { ascending: false });

  if (search) {
    query = query.or(
      `candidate_reference.ilike.%${search}%,professional_title.ilike.%${search}%,general_location.ilike.%${search}%,desired_role.ilike.%${search}%`
    );
  }

  const { data, error } = await query.limit(100);
  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_PROFILES_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: sanitizeEmployerCandidateProfiles((data ?? []) as Array<Record<string, unknown>>),
  });
}
