import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

async function getCandidateId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data?.id) return null;
  return String(data.id);
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-document-verification-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const candidateId = await getCandidateId(auth.userId);
  if (!candidateId) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const [versionsResult, casesResult, actionsResult] = await Promise.all([
    supabase
      .from("candidate_document_versions")
      .select("id, document_type, version_number, original_filename, verification_status, reviewer_decision, identity_confidence_score, fraud_risk_score, external_verification_status, is_active, is_primary, created_at, superseded_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("candidate_document_verification_cases")
      .select("id, document_version_id, status, priority, requested_evidence, candidate_message, created_at, updated_at, resolved_at")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("candidate_document_verification_case_actions")
      .select("id, case_id, action, previous_status, new_status, note, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  if (versionsResult.error || casesResult.error || actionsResult.error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DOCUMENT_VERIFICATION_LOAD_FAILED",
          message: "Unable to load document verification timeline",
        },
      },
      { status: 500 }
    );
  }

  const caseIds = new Set((casesResult.data ?? []).map((entry) => String(entry.id)));
  const actions = (actionsResult.data ?? [])
    .filter((entry) => caseIds.has(String(entry.case_id)))
    .map((entry) => {
      if (auth.role === "candidate") {
        return {
          id: entry.id,
          case_id: entry.case_id,
          action: entry.action,
          previous_status: entry.previous_status,
          new_status: entry.new_status,
          created_at: entry.created_at,
        };
      }

      return entry;
    });

  return NextResponse.json({
    success: true,
    data: {
      versions: versionsResult.data ?? [],
      cases: casesResult.data ?? [],
      actions,
    },
  });
}
