import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { requireAuth } from "@/lib/server/security/auth";
import { evaluateCandidateProfileCompletion } from "@/lib/server/candidates/profile-completion";
import { persistRefreshedSession } from "@/lib/server/security/session-cookies";
import { createSupabasePublicClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "auth-me", 120);
    if (rateLimitResult) return rateLimitResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      if (auth.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHENTICATED",
              message: "No active session",
            },
          },
          { status: 200 }
        );
      }

      return auth;
    }

    const supabase = createSupabasePublicClient();
    const { data: userPayload } = await supabase.auth.getUser(auth.accessToken);
    const displayName = String(userPayload.user?.user_metadata?.full_name ?? "").trim() || null;

    const candidateCompletion =
      auth.role === "candidate" ? await evaluateCandidateProfileCompletion(auth.userId) : null;
    const employer = auth.role === "employer" ? await getEmployerByAuthUserId(auth.userId) : null;
    const verificationStatus = (employer?.verification_status as string | null) ?? null;
    const accountStatus =
      auth.role === "employer" ? (verificationStatus === "verified" ? "active" : "pending_review") : null;

    const response = NextResponse.json({
      success: true,
      data: {
        userId: auth.userId,
        email: auth.email,
        role: auth.role,
        displayName,
        verificationStatus,
        accountStatus,
        profileCompletion: candidateCompletion,
      },
    });

    persistRefreshedSession(response, auth);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "AUTH_ME_FAILED",
          message: error instanceof Error ? error.message : "Unable to load session information.",
        },
      },
      { status: 500 }
    );
  }
}
