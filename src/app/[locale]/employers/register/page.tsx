"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";

const companySizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

type RegisterResult = {
  success: boolean;
  error?: { message: string };
};

export default function EmployerRegisterPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();

  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    companyName: "",
    commercialRegistrationNumber: "",
    taxNumber: "",
    country: "",
    city: "",
    address: "",
    website: "",
    companyEmail: "",
    hrContact: "",
    phoneNumber: "",
    industry: "",
    companySize: "11-50",
    companyDescription: "",
  });

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  const disabled = useMemo(() => loading || !csrfToken, [csrfToken, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== confirmPassword) {
      setError(isArabic ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    if (!acceptTerms) {
      setError(isArabic ? "يجب الموافقة على الشروط وسياسة الخصوصية." : "You must accept the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/employers/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as RegisterResult;
      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? (isArabic ? "تعذر تسجيل الشركة." : "Unable to register company"));
        return;
      }

      router.push("/employer/pending-approval");
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء إرسال التسجيل." : "Unexpected error while submitting registration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-8 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{isArabic ? "إنشاء حساب صاحب عمل" : "Employer Create Account"}</h1>
        <p className="mt-3 text-sm text-text-secondary">{isArabic ? "أنشئ حساب شركتك. تبقى الشركة في حالة pending_review حتى يعتمدها فريق برايم جلوبال قبل نشر الوظائف أو الوصول إلى بيانات المرشحين." : "Create your company account. The company stays in pending_review until Prime Global approves it before publishing jobs or accessing candidate data."}</p>

        <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
          {[
            ["email", isArabic ? "بريد الدخول" : "Login Email", "email"],
            ["password", isArabic ? "كلمة المرور" : "Password", "password"],
            ["companyName", isArabic ? "اسم الشركة" : "Company Name", "text"],
            ["commercialRegistrationNumber", isArabic ? "رقم السجل التجاري" : "Company Registration Number", "text"],
            ["taxNumber", isArabic ? "الرقم الجبائي" : "Tax Number", "text"],
            ["country", isArabic ? "الدولة" : "Country", "text"],
            ["city", isArabic ? "المدينة" : "City", "text"],
            ["address", isArabic ? "العنوان" : "Address", "text"],
            ["website", isArabic ? "الموقع الإلكتروني" : "Website", "url"],
            ["companyEmail", isArabic ? "بريد الشركة" : "Company Email", "email"],
            ["hrContact", isArabic ? "الشخص المسؤول" : "Contact Person", "text"],
            ["phoneNumber", isArabic ? "رقم الهاتف" : "Phone Number", "text"],
            ["industry", isArabic ? "القطاع" : "Industry", "text"],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-sm text-text-secondary">
              <span className="mb-2 block">{label}</span>
              <input
                required={key !== "website"}
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, [key]: event.target.value }))
                }
                className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
              />
            </label>
          ))}

          <label className="block text-sm text-text-secondary">
            <span className="mb-2 block">{isArabic ? "تأكيد كلمة المرور" : "Confirm Password"}</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            />
          </label>

          <label className="block text-sm text-text-secondary">
            <span className="mb-2 block">{isArabic ? "حجم الشركة" : "Company Size"}</span>
            <select
              value={form.companySize}
              onChange={(event) => setForm((prev) => ({ ...prev, companySize: event.target.value }))}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            >
              {companySizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-text-secondary md:col-span-2">
            <span className="mb-2 block">{isArabic ? "وصف الشركة" : "Company Description"}</span>
            <textarea
              required
              rows={5}
              value={form.companyDescription}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, companyDescription: event.target.value }))
              }
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            />
          </label>

          <label className="md:col-span-2 flex min-h-12 items-start gap-3 rounded-2xl border border-gold/15 bg-bg-primary/40 px-4 py-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gold/30"
            />
            <span>{isArabic ? "أوافق على الشروط وسياسة الخصوصية ومتطلبات التحقق من الشركة." : "I accept the Terms, Privacy Policy, and company verification requirements."}</span>
          </label>

          {error ? <p className="text-sm text-red-300 md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={disabled}
              className="prime-auth-pill"
            >
              {loading ? (isArabic ? "جارٍ الإرسال..." : "Submitting...") : isArabic ? "إنشاء الحساب" : "Create Employer Account"}
            </button>
          </div>

          <p className="md:col-span-2 text-sm text-text-secondary">
            {isArabic ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
            <Link href="/employers/login" className="font-semibold text-gold hover:text-gold-bright">
              {isArabic ? "تسجيل الدخول" : "Sign In"}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
