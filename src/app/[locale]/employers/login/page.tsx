"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";

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
        body: JSON.stringify({ email, password, role: "employer" }),
      });

      const payload = (await response.json()) as LoginResult;
      if (!response.ok || !payload.success || !payload.data?.session?.accessToken) {
        setError(payload.error?.message ?? (isArabic ? "تعذر تسجيل الدخول." : "Unable to login"));
        return;
      }

      localStorage.setItem("prime_auth_token", payload.data.session.accessToken);
      if (payload.data.user?.verificationStatus && payload.data.user.verificationStatus !== "verified") {
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
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-8 backdrop-blur-xl">
        <h1 className="font-heading text-4xl text-text-primary">{isArabic ? "تسجيل دخول صاحب العمل" : "Employer Login"}</h1>
        <p className="mt-3 text-sm text-text-secondary">{isArabic ? "ادخل إلى مركز المقابلات ولوحة التوظيف الخاصة بشركتك." : "Access your company dashboard and manage your hiring pipeline."}</p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "البريد الإلكتروني للشركة" : "Work Email"}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-secondary">{isArabic ? "كلمة المرور" : "Password"}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-bg-primary transition hover:bg-gold-bright disabled:opacity-60"
          >
            {loading ? (isArabic ? "جارٍ تسجيل الدخول..." : "Signing In...") : isArabic ? "تسجيل الدخول" : "Sign In"}
          </button>

          <p className="text-sm text-text-secondary">
            {isArabic ? "تحتاج إلى حساب جديد؟" : "Need a new company account?"}{" "}
            <Link href="/employer/register" className="font-semibold text-gold hover:text-gold-bright">
              {isArabic ? "إنشاء حساب" : "Create Account"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
