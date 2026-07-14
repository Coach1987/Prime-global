import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { signContractSchema } from "@/features/employers/schemas/contracts";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "contracts-sign", 50);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, signContractSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
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

  const signatureHash = crypto.createHash("sha256").update(parsed.data.signature).digest("hex");
  const { contractId } = await params;

  const { data, error } = await supabase
    .from("employment_contracts")
    .update({
      status: "signed",
      signature_hash: signatureHash,
      signed_at: new Date().toISOString(),
    })
    .eq("id", contractId)
    .eq("candidate_id", candidate.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "CONTRACT_SIGN_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}
