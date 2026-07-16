"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeCheckbox, PrimeInput, PrimeLabel } from "@/components/ui/prime/PrimeInput";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type RegisterResponse = {
  success: boolean;
  data?: {
    session?: {
      accessToken: string;
    };
  };
  error?: {
    message?: string;
  };
};

export default function CandidateRegisterPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    phoneNumber: "",
    acceptTerms: false,
  });

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError(isArabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    if (!form.acceptTerms) {
      setError(isArabic ? "يجب الموافقة على الشروط وسياسة الخصوصية." : "You must accept the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          country: form.country,
          phoneNumber: form.phoneNumber,
          acceptTerms: form.acceptTerms,
        }),
      });

      const payload = (await response.json()) as RegisterResponse;
      if (!response.ok || !payload.success || !payload.data?.session?.accessToken) {
        setError(payload?.error?.message ?? (isArabic ? "تعذر إنشاء الحساب." : "Unable to create account."));
        return;
      }

      localStorage.setItem("prime_auth_token", payload.data.session.accessToken);
      router.push("/candidate/onboarding");
      router.refresh();
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء إنشاء الحساب." : "Unexpected error while creating the account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8 md:p-10">
        <PrimePageTitle>{isArabic ? "إنشاء حساب مرشح" : "Candidate Create Account"}</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "أنشئ حسابك أولاً، ثم أكمل إعداد ملفك المهني بشكل خاص داخل برايم جلوبال."
            : "Create your account first, then complete your professional profile privately inside Prime Global."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "الاسم الكامل" : "Full name"}</span>
            <PrimeInput
              required
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </PrimeLabel>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "البريد الإلكتروني" : "Email"}</span>
            <PrimeInput
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </PrimeLabel>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "كلمة المرور" : "Password"}</span>
              <PrimeInput
                type="password"
                required
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "تأكيد كلمة المرور" : "Confirm password"}</span>
              <PrimeInput
                type="password"
                required
                value={form.confirmPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              />
            </PrimeLabel>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "الدولة" : "Country"}</span>
              <PrimeInput
                required
                value={form.country}
                onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
              />
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "رقم الهاتف" : "Phone number"}</span>
              <PrimeInput
                required
                value={form.phoneNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
              />
            </PrimeLabel>
          </div>

          <label className="flex min-h-12 items-start gap-3 rounded-2xl border border-blue-200/20 bg-[#071428]/75 px-4 py-3 text-sm text-text-secondary">
            <PrimeCheckbox
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(event) => setForm((prev) => ({ ...prev, acceptTerms: event.target.checked }))}
            />
            <span>
              {isArabic ? "أوافق على الشروط وسياسة الخصوصية وإجراءات التنسيق الخاصة بالتوظيف." : "I accept the Terms, Privacy Policy, and recruitment coordination process."}
            </span>
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || !csrfToken}
            className={primeButtonClasses("primary")}
          >
            {loading ? (isArabic ? "جارٍ إنشاء الحساب..." : "Creating account...") : isArabic ? "إنشاء الحساب" : "Create Account"}
          </button>

          <p className="text-sm text-text-secondary">
            {isArabic ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
            <Link href="/candidate/login" className="font-semibold text-blue-200 hover:text-blue-100">
              {isArabic ? "تسجيل الدخول" : "Sign In"}
            </Link>
          </p>
        </form>
      </PrimeCard>
    </main>
  );
}