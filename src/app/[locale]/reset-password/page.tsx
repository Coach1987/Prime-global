"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import { useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { createClient, type Session } from "@supabase/supabase-js";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

function parseRole(value: string | null): "candidate" | "employer" {
  return value === "employer" ? "employer" : "candidate";
}

function buildSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public configuration is missing for password reset.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRecoverySession(supabase: ReturnType<typeof buildSupabaseClient>) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.user) {
      return data.session;
    }

    await pause(120);
  }

  return null;
}

function ResetPasswordContent() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsSnapshot = searchParams.toString();
  const role = parseRole(searchParams.get("role"));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = useMemo(() => buildSupabaseClient(), []);

  const recoveryParams = useMemo(() => {
    const parsed = new URLSearchParams(searchParamsSnapshot);
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const hashParams = new URLSearchParams(hash);

    return {
      code: parsed.get("code") ?? hashParams.get("code"),
      tokenHash: parsed.get("token_hash") ?? hashParams.get("token_hash"),
      otpType: parsed.get("type") ?? hashParams.get("type"),
      accessToken: parsed.get("access_token") ?? hashParams.get("access_token"),
      refreshToken: parsed.get("refresh_token") ?? hashParams.get("refresh_token"),
    };
  }, [searchParamsSnapshot]);

  const signInHref = useMemo(() => `/auth?mode=signin&audience=${role}&reset=1`, [role]);

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      setSessionChecking(true);
      setSessionReady(false);
      setRecoveryReady(false);
      setError(null);

      try {
        const { code, tokenHash, otpType, accessToken, refreshToken } = recoveryParams;

        if (tokenHash) {
          if (otpType && otpType !== "recovery") {
            if (!cancelled) {
              setError(isArabic ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." : "Reset link is invalid or expired.");
            }
            return;
          }

          const { error: otpError } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });

          if (otpError) {
            if (!cancelled) {
              setError(isArabic ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." : "Reset link is invalid or expired.");
            }
            return;
          }
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (!cancelled) {
              setError(isArabic ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." : "Reset link is invalid or expired.");
            }
            return;
          }
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            if (!cancelled) {
              setError(isArabic ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." : "Reset link is invalid or expired.");
            }
            return;
          }
        } else {
          if (!cancelled) {
            setError(isArabic ? "رابط إعادة التعيين غير صالح أو منتهي الصلاحية." : "Reset link is invalid or expired.");
          }
          return;
        }

        if (!cancelled) {
          setRecoveryReady(true);
        }

        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        const activeSession = await waitForRecoverySession(supabase);
        if (!activeSession?.user) {
          return;
        }

        if (!cancelled) {
          setSessionReady(true);
        }
      } catch {
        if (!cancelled) {
          setError(isArabic ? "حدث خطأ غير متوقع أثناء إعادة التعيين." : "Unexpected error during password reset.");
        }
      } finally {
        if (!cancelled) {
          setSessionChecking(false);
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [isArabic, recoveryParams, supabase]);

  async function ensureRecoverySession(): Promise<Session | null> {
    const activeSession = await waitForRecoverySession(supabase);
    return activeSession?.user ? activeSession : null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionReady || sessionChecking) {
      setError(isArabic ? "جارٍ التحقق من رابط إعادة التعيين. حاول مرة أخرى بعد لحظات." : "Validating reset link. Please try again in a moment.");
      return;
    }

    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError(isArabic ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل." : "Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError(isArabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const activeSession = await ensureRecoverySession();
      if (!activeSession) {
        setError(isArabic ? "رابط إعادة التعيين غير مكتمل." : "Reset link is incomplete.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(isArabic ? "تعذر تحديث كلمة المرور. حاول مرة أخرى." : "Unable to update password. Please try again.");
        return;
      }

      await supabase.auth.signOut().catch(() => undefined);

      setSuccess(
        isArabic
          ? "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة."
          : "Password updated successfully. You can now sign in with your new password."
      );

      setTimeout(() => {
        router.push(signInHref);
      }, 900);
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء إعادة التعيين." : "Unexpected error during password reset.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
        <PrimePageTitle>{isArabic ? "تعيين كلمة مرور جديدة" : "Set New Password"}</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "أدخل كلمة مرور جديدة آمنة لإكمال استعادة الحساب."
            : "Enter a secure new password to complete account recovery."}
        </p>

        {sessionChecking ? (
          <p className="mt-7 text-sm text-text-secondary">{isArabic ? "جارٍ التحقق من جلسة الاستعادة..." : "Verifying recovery session..."}</p>
        ) : null}

        {!sessionChecking && recoveryReady ? <form className="mt-7 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "كلمة المرور الجديدة" : "New Password"}</label>
            <PrimeInput
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
            <PrimeInput
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <button type="submit" disabled={loading} className={primeButtonClasses("primary")}>
            {loading ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : isArabic ? "تحديث كلمة المرور" : "Update Password"}
          </button>

          <p className="text-sm text-text-secondary">
            <Link href={signInHref} className="font-semibold text-blue-200 hover:text-blue-100">
              {isArabic ? "العودة إلى تسجيل الدخول" : "Back to Sign In"}
            </Link>
          </p>
        </form> : null}

        {!sessionChecking && !recoveryReady ? (
          <p className="mt-6 text-sm text-text-secondary">
            <Link href={signInHref} className="font-semibold text-blue-200 hover:text-blue-100">
              {isArabic ? "العودة إلى تسجيل الدخول" : "Back to Sign In"}
            </Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
          <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
            <PrimePageTitle>Set New Password</PrimePageTitle>
            <p className="mt-3 text-sm text-text-secondary">Loading...</p>
          </section>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
