import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "enterprise-overview", 80);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json({ success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } }, { status: 404 });
  }

  const [trustScoreResult, contractsResult, verificationResult] = await Promise.all([
    supabase.from("prime_trust_scores").select("*").eq("employer_id", employer.id).maybeSingle(),
    supabase.from("employment_contracts").select("id, status, signed_at, created_at, contract_storage_path, candidate_id, offer_id").eq("employer_id", employer.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("company_verification_requests").select("id, company_name, status, created_at").eq("employer_id", employer.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const trustScore = trustScoreResult.data ?? null;
  const contracts = contractsResult.data ?? [];
  const verification = verificationResult.data ?? [];

  return NextResponse.json({
    success: true,
    data: {
      trustScore,
      contracts,
      verification,
      summary: {
        contractCount: contracts.length,
        verificationCount: verification.length,
        badge: trustScore?.trust_badge ?? "bronze",
      },
    },
  });
}
