"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";
import { PrimePasswordInput } from "@/components/ui/prime/PrimePasswordInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import Link from "next/link";

function localizeLoginError(message: string | null | undefined, locale: string, t: ReturnType<typeof useTranslations>) {
  if (!message) return t("errors.signInFailed");
  if (locale !== "ar") return message;

  if (message === "Role mismatch for this login path.") return "هذا الحساب غير مخصص لهذه البوابة.";
  if (message === "Invalid credentials" || message.toLowerCase().includes("invalid")) return "بيانات تسجيل الدخول غير صحيحة.";
  if (message.toLowerCase().includes("rate") || message.toLowerCase().includes("too many")) return "عدد المحاولات كبير. حاول مرة أخرى بعد قليل.";

  return t("errors.signInFailed");
}

export default function StaffLoginPage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params.locale ?? "en");
  const t = useTranslations("ownerPortal.login");
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

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        const role = String(payload?.data?.role ?? "");
        const isStaff = role === "prime_global_recruiter" || role === "prime_global_admin" || role === "admin" || role === "super_admin";
        if (payload?.success && isStaff) {
          router.push(`/${params.locale}/admin/control-center`);
        }
      })
      .catch(() => undefined);
  }, [params.locale, router]);

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
        body: JSON.stringify({ email, password, role: "staff" }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(localizeLoginError(payload?.error?.message, locale, t));
        return;
      }

      router.push(`/${params.locale}/admin/control-center`);
    } catch {
      setError(locale === "ar" ? "حدث خطأ غير متوقع أثناء محاولة تسجيل الدخول." : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8">
        <PrimePageTitle>{t("title")}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">
          {t("subtitle")}
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">{t("staffEmail")}</label>
            <PrimeInput
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-secondary">{t("password")}</label>
            <PrimePasswordInput
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              showPasswordLabel={t("showPassword")}
              hidePasswordLabel={t("hidePassword")}
            />
          </div>

          <p className="text-sm">
            <Link
              href={`/${params.locale}/forgot-password?role=staff`}
              className="font-semibold text-blue-200 hover:text-blue-100"
            >
              {t("forgotPassword")}
            </Link>
          </p>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className={primeButtonClasses("primary")}
          >
            {loading ? t("signingIn") : t("signIn")}
          </button>
        </form>
      </PrimeCard>
    </main>
  );
}
