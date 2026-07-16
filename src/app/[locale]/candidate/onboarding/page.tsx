"use client";

import { FormEvent, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCheckbox, PrimeInput, PrimeLabel, PrimeTextarea } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type CandidateProfile = {
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  city?: string | null;
  professional_title?: string | null;
  bio?: string | null;
};

export default function CandidateOnboardingPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const [token, setToken] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [form, setForm] = useState({
    city: "",
    desiredPosition: "",
    experienceLevel: "",
    shortBio: "",
    skills: "",
    jobAlertsEnabled: true,
  });

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    setToken(accessToken);

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    if (!accessToken) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/candidates/profile", { headers: { Authorization: `Bearer ${accessToken}` } }),
    ])
      .then(async ([authResponse, profileResponse]) => {
        const [authPayload, profilePayload] = await Promise.all([authResponse.json(), profileResponse.json()]);

        if (!authResponse.ok || !authPayload?.success || authPayload?.data?.role !== "candidate") {
          setError(isArabic ? "هذه الصفحة مخصصة للمرشحين المسجلين فقط." : "This page is only for authenticated candidates.");
          return;
        }

        if (!profileResponse.ok || !profilePayload?.success) {
          setError(profilePayload?.error?.message ?? (isArabic ? "تعذر تحميل الملف الشخصي." : "Unable to load profile."));
          return;
        }

        const nextProfile = (profilePayload.data ?? null) as CandidateProfile | null;
        setProfile(nextProfile);
        setForm((prev) => ({
          ...prev,
          city: String(nextProfile?.city ?? ""),
          desiredPosition: String(nextProfile?.professional_title ?? ""),
          shortBio: String(nextProfile?.bio ?? ""),
        }));
      })
      .catch(() => setError(isArabic ? "تعذر تحميل بيانات الإعداد." : "Unable to load onboarding data."))
      .finally(() => setLoading(false));
  }, [isArabic]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !profile) return;

    setSaving(true);
    setError(null);

    const skills = form.skills
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    try {
      const profileResponse = await fetch("/api/candidates/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          fullName: profile.full_name ?? "",
          email: profile.email ?? "",
          phoneNumber: profile.phone_number ?? "",
          country: profile.country ?? "",
          city: form.city,
          professionalTitle: form.desiredPosition,
          bio: form.shortBio,
        }),
      });

      const profilePayload = await profileResponse.json();
      if (!profileResponse.ok || !profilePayload?.success) {
        setError(profilePayload?.error?.message ?? (isArabic ? "تعذر حفظ الملف الأساسي." : "Unable to save core profile."));
        return;
      }

      const professionalResponse = await fetch("/api/candidates/professional-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          headline: form.desiredPosition,
          biography: form.shortBio,
          experiences: [],
          educationEntries: [],
          certificates: [],
          skills,
          languages: [],
          portfolioUrl: "",
          linkedInUrl: "",
          websiteUrl: "",
          availability: "",
          nationality: profile.country ?? "",
        }),
      });

      const professionalPayload = await professionalResponse.json();
      if (!professionalResponse.ok || !professionalPayload?.success) {
        setError(professionalPayload?.error?.message ?? (isArabic ? "تعذر حفظ الملف المهني." : "Unable to save professional profile."));
        return;
      }

      const alertsResponse = await fetch("/api/candidates/job-alert-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          desiredJobTitles: form.desiredPosition ? [form.desiredPosition] : [],
          relatedJobTitles: [],
          skills,
          experienceLevel: form.experienceLevel || null,
          industry: null,
          country: profile.country ?? null,
          city: form.city || null,
          workModePreference: "any",
          languages: [],
          availability: null,
          emailNotificationFrequency: form.jobAlertsEnabled ? "instant" : "disabled",
          notificationThreshold: 70,
          unsubscribed: !form.jobAlertsEnabled,
        }),
      });

      const alertsPayload = await alertsResponse.json();
      if (!alertsResponse.ok || !alertsPayload?.success) {
        setError(alertsPayload?.error?.message ?? (isArabic ? "تعذر حفظ إعدادات التنبيه." : "Unable to save job alert settings."));
        return;
      }

      router.push("/candidate/dashboard");
      router.refresh();
    } catch {
      setError(isArabic ? "حدث خطأ غير متوقع أثناء الحفظ." : "Unexpected error while saving your onboarding.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-blue-200/20 bg-[#081223]/82 p-8 backdrop-blur-xl text-sm text-text-secondary">
          {isArabic ? "جارٍ تحميل الإعداد الأولي..." : "Loading onboarding..."}
        </section>
      </main>
    );
  }

  if (!token || !profile) {
    return (
      <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-blue-200/20 bg-[#081223]/82 p-8 backdrop-blur-xl">
          <h1 className="font-heading text-3xl text-text-primary">{isArabic ? "الدخول مطلوب" : "Sign in required"}</h1>
          <p className="mt-3 text-sm text-text-secondary">{error ?? (isArabic ? "يجب تسجيل الدخول أولاً للوصول إلى إعداد الملف الشخصي." : "You need to sign in before continuing to onboarding.")}</p>
          <Link href="/candidate/login" className={`${primeButtonClasses("secondary")} mt-5`}>
            {isArabic ? "فتح تسجيل الدخول" : "Open sign in"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8 md:p-10">
        <PrimePageTitle>{isArabic ? "إعداد الملف المهني" : "Candidate Onboarding"}</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "أكمل ملفك المهني بشكل خاص. تظل بياناتك الحساسة خارج متناول أصحاب العمل ما لم تسمح سياسات برايم غلوبال بعرض النسخة المحمية فقط."
            : "Complete your professional profile privately. Sensitive details remain unavailable to employers unless Prime Global permits only the protected projection."}
        </p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المدينة" : "City"}</span>
              <PrimeInput
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المنصب المطلوب" : "Desired position"}</span>
              <PrimeInput
                required
                value={form.desiredPosition}
                onChange={(event) => setForm((prev) => ({ ...prev, desiredPosition: event.target.value }))}
              />
            </PrimeLabel>
          </div>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "مستوى الخبرة" : "Experience level"}</span>
            <PrimeInput
              value={form.experienceLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, experienceLevel: event.target.value }))}
              placeholder={isArabic ? "مثل: 3-5 سنوات" : "Example: 3-5 years"}
            />
          </PrimeLabel>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "ملخص مهني" : "Professional summary"}</span>
            <PrimeTextarea
              rows={5}
              value={form.shortBio}
              onChange={(event) => setForm((prev) => ({ ...prev, shortBio: event.target.value }))}
            />
          </PrimeLabel>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "المهارات" : "Skills"}</span>
            <PrimeInput
              value={form.skills}
              onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))}
              placeholder={isArabic ? "افصل المهارات بفواصل" : "Separate skills with commas"}
            />
          </PrimeLabel>

          <label className="flex min-h-12 items-start gap-3 rounded-2xl border border-blue-200/20 bg-[#071428]/75 px-4 py-3 text-sm text-text-secondary">
            <PrimeCheckbox
              type="checkbox"
              checked={form.jobAlertsEnabled}
              onChange={(event) => setForm((prev) => ({ ...prev, jobAlertsEnabled: event.target.checked }))}
            />
            <span>{isArabic ? "فعّل تنبيهات الوظائف لهذا الملف." : "Enable job alerts for this profile."}</span>
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={saving || !csrfToken}
            className={primeButtonClasses("primary")}
          >
            {saving ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : isArabic ? "حفظ ومتابعة" : "Save and continue"}
          </button>
        </form>
      </PrimeCard>
    </main>
  );
}