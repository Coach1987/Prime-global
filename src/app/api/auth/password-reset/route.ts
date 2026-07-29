import { NextResponse } from "next/server";
import { z } from "zod";
import { SITE_URL } from "@/lib/constants/site";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabasePublicClient } from "@/lib/server/supabase";

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["candidate", "employer"]).default("candidate"),
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "auth-password-reset", 12);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const parsed = await parseJsonBody(request, passwordResetRequestSchema);
  if (parsed.error) return parsed.error;

  const payload = parsed.data;
  const supabase = createSupabasePublicClient();

  const resetUrl = `${SITE_URL}/auth/recovery?locale=${payload.locale}`;
  const { error } = await supabase.auth.resetPasswordForEmail(payload.email, {
    redirectTo: resetUrl,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PASSWORD_RESET_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      message: "If the account exists, a reset email has been sent.",
    },
  });
}
