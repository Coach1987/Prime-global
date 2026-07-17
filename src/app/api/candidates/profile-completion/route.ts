import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { evaluateCandidateProfileCompletion } from "@/lib/server/candidates/profile-completion";
import { requireAuth, requireRole } from "@/lib/server/security/auth";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-profile-completion-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const completion = await evaluateCandidateProfileCompletion(auth.userId);

  return NextResponse.json({
    success: true,
    data: completion,
  });
}
