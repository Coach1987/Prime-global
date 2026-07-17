"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type LoginResult = {
  success: boolean;
  data?: {
    user?: {
      verificationStatus?: string | null;
      accountStatus?: string | null;
    };
    session?: {
      accessToken: string;
    };
  };
  error?: {
    message: string;
  };
};

export default function EmployerLoginPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>("");

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success || payload?.data?.role !== "employer") return;
        router.push("/employers/dashboard");
      })
      .catch(() => undefined);
  }, [router]);

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
        body: JSON.stringify({ email, password, role: "employer" }),
      });

      const payload = (await response.json()) as LoginResult;
      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? (isArabic ? "تعذر تسجيل الدخول." : "Unable to login"));
        return;
      }

      const verificationStatus = payload.data?.user?.verificationStatus;
      if (verificationStatus && verificationStatus !== "verified") {
        router.push("/employer/pending-approval");
        return;
      }

      router.push("/employers/interview-center");
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء تسجيل الدخول." : "Unexpected error while logging in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8">
        <PrimePageTitle>{isArabic ? "تسجيل دخول صاحب العمل" : "Employer Login"}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{isArabic ? "ادخل إلى مركز المقابلات ولوحة التوظيف الخاصة بشركتك." : "Access your company dashboard and manage your hiring pipeline."}</p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "البريد الإلكتروني للشركة" : "Work Email"}</label>
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
            {isArabic ? "تحتاج إلى حساب جديد؟" : "Need a new company account?"}{" "}
            <Link href="/employer/register" className="font-semibold text-blue-200 hover:text-blue-100">
              {isArabic ? "إنشاء حساب" : "Create Account"}
            </Link>
          </p>
        </form>
      </PrimeCard>
    </main>
  );
}
