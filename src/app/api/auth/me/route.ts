import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { requireAuth } from "@/lib/server/security/auth";
import { evaluateCandidateProfileCompletion } from "@/lib/server/candidates/profile-completion";
import { persistRefreshedSession } from "@/lib/server/security/session-cookies";
import { createSupabasePublicClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "auth-me", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = createSupabasePublicClient();
  const { data: userPayload } = await supabase.auth.getUser(auth.accessToken);
  const displayName = String(userPayload.user?.user_metadata?.full_name ?? "").trim() || null;

  const candidateCompletion =
    auth.role === "candidate" ? await evaluateCandidateProfileCompletion(auth.userId) : null;

  const response = NextResponse.json({
    success: true,
    data: {
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
      displayName,
      profileCompletion: candidateCompletion,
    },
  });

  persistRefreshedSession(response, auth);
  return response;
}
