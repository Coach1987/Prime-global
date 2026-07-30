import { NextResponse } from "next/server";
import { z } from "zod";
import { SITE_URL } from "@/lib/constants/site";
import { serverEnv } from "@/lib/server/config/env";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

async function sendPasswordResetEmail(input: {
  email: string;
  locale: "en" | "ar";
  actionLink: string;
}) {
  // In local/dev environments we allow reset flow verification even without a mail provider.
  if (!serverEnv.RESEND_API_KEY) {
    console.warn("[auth-password-reset] RESEND_API_KEY not configured; skipping email delivery");
    return;
  }

  const isArabic = input.locale === "ar";
  const subject = isArabic ? "إعادة تعيين كلمة المرور" : "Reset your Prime Global password";
  const text = isArabic
    ? `لقد طلبت إعادة تعيين كلمة المرور. استخدم الرابط التالي لإكمال العملية:\n\n${input.actionLink}\n\nإذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.`
    : `You requested a password reset. Use this link to complete the process:\n\n${input.actionLink}\n\nIf you did not request this, you can ignore this email.`;
  const html = isArabic
    ? `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><p>لقد طلبت إعادة تعيين كلمة المرور.</p><p><a href="${input.actionLink}">انقر هنا لإعادة تعيين كلمة المرور</a></p><p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.</p></div>`
    : `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><p>You requested a password reset.</p><p><a href="${input.actionLink}">Click here to reset your password</a></p><p>If you did not request this, you can ignore this email.</p></div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: serverEnv.EMAIL_FROM ?? "Prime Global <password-reset@tx.primeglobal.com>",
      to: [input.email],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Resend request failed: ${response.status} ${details}`);
  }
}

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["candidate", "employer", "staff"]).default("candidate"),
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
  const supabase = createSupabaseAdminClient();
  const locale: "en" | "ar" = payload.locale === "ar" ? "ar" : "en";

  const resetUrl = `${SITE_URL}/auth/recovery?locale=${locale}&role=${payload.role}`;
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: payload.email,
    options: {
      redirectTo: resetUrl,
    },
  });

  if (error && error.status !== 404) {
    return NextResponse.json(
      { success: false, error: { code: "PASSWORD_RESET_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  const actionLink = data?.properties?.action_link;
  if (actionLink) {
    try {
      await sendPasswordResetEmail({
        email: payload.email,
        locale,
        actionLink,
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Failed to send password reset email";
      return NextResponse.json(
        { success: false, error: { code: "PASSWORD_RESET_FAILED", message } },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      message: "If the account exists, a reset email has been sent.",
    },
  });
}
