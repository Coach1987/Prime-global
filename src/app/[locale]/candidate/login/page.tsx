"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

export default function CandidateLoginPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email, password, role: "candidate" }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data?.session?.accessToken) {
        setError(payload?.error?.message ?? (isArabic ? "تعذر تسجيل الدخول." : "Unable to sign in"));
        return;
      }

      localStorage.setItem("prime_auth_token", payload.data.session.accessToken);
      router.push("/candidate/my-interviews");
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء تسجيل الدخول." : "Unexpected error while logging in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8">
        <PrimePageTitle>{isArabic ? "تسجيل دخول المرشح" : "Candidate Login"}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{isArabic ? "سجّل الدخول للوصول إلى مقابلاتك وسير التواصل المحمي داخل المنصة." : "Sign in to access My Interviews and protected conversation workflow."}</p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "البريد الإلكتروني" : "Email"}</label>
            <PrimeInput
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "كلمة المرور" : "Password"}</label>
            <PrimeInput
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className={primeButtonClasses("primary")}
          >
            {loading ? (isArabic ? "جارٍ تسجيل الدخول..." : "Signing In...") : isArabic ? "تسجيل الدخول" : "Sign In"}
          </button>

          <p className="text-sm text-text-secondary">
            {isArabic ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
            <Link href="/candidate/register" className="font-semibold text-blue-200 hover:text-blue-100">
              {isArabic ? "أنشئ حسابًا" : "Create Account"}
            </Link>
          </p>
        </form>
      </PrimeCard>
    </main>
  );
}
