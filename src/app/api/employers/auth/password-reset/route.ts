import { NextResponse } from "next/server";
import { employerPasswordResetSchema } from "@/features/employers/schemas/portal";
import { SITE_URL } from "@/lib/constants/site";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabasePublicClient } from "@/lib/server/supabase";

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-password-reset", 12);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, employerPasswordResetSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabasePublicClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/employers/login?reset=1`,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PASSWORD_RESET_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { message: "If the account exists, a reset email has been sent." },
  });
}
