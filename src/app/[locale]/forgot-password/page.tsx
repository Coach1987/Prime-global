"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

function parseRole(value: string | null): "candidate" | "employer" | "staff" {
  if (value === "staff") return "staff";
  return value === "employer" ? "employer" : "candidate";
}

function ForgotPasswordContent() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const searchParams = useSearchParams();
  const role = parseRole(searchParams.get("role"));

  const [csrfToken, setCsrfToken] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCsrf() {
      const response = await fetch("/api/security/csrf", { credentials: "include" }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      if (!cancelled) {
        setCsrfToken(String(payload?.data?.csrfToken ?? ""));
      }
    }

    void loadCsrf();

    return () => {
      cancelled = true;
    };
  }, []);

  const signInHref = useMemo(() => {
    if (role === "staff") return "/admin/login";
    return `/auth?mode=signin&audience=${role}`;
  }, [role]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          email,
          role,
          locale: isArabic ? "ar" : "en",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(
          isArabic
            ? "تعذر إرسال بريد إعادة التعيين الآن. حاول مرة أخرى."
            : "We couldn't send a reset email right now. Please try again."
        );
        return;
      }

      setSuccess(
        isArabic
          ? "إذا كان البريد مرتبطا بحساب، فستتلقى رسالة إعادة التعيين خلال لحظات."
          : "If the email is linked to an account, you will receive a password reset message shortly."
      );
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع." : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
        <PrimePageTitle>{isArabic ? "استعادة كلمة المرور" : "Forgot Password"}</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "أدخل البريد الإلكتروني المستخدم في تسجيل الدخول وسنرسل لك رابطا آمنا لتعيين كلمة مرور جديدة."
            : "Enter the email used for sign in and we will send a secure link to set a new password."}
        </p>

        <form className="mt-7 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">
              {role === "employer"
                ? isArabic
                  ? "البريد الإلكتروني للعمل"
                  : "Work Email"
                : role === "staff"
                  ? isArabic
                    ? "بريد الموظف"
                    : "Staff Email"
                : isArabic
                  ? "البريد الإلكتروني"
                  : "Email"}
            </label>
            <PrimeInput
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <button type="submit" disabled={loading || !csrfToken} className={primeButtonClasses("primary")}>
            {loading ? (isArabic ? "جارٍ الإرسال..." : "Sending...") : isArabic ? "إرسال رابط إعادة التعيين" : "Send Reset Link"}
          </button>

          <p className="text-sm text-text-secondary">
            <Link href={signInHref} className="font-semibold text-blue-200 hover:text-blue-100">
              {isArabic ? "العودة إلى تسجيل الدخول" : "Back to Sign In"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";

  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
          <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
            <PrimePageTitle>{isArabic ? "استعادة كلمة المرور" : "Forgot Password"}</PrimePageTitle>
            <p className="mt-3 text-sm text-text-secondary">{isArabic ? "جارٍ التحميل..." : "Loading..."}</p>
          </section>
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
