"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCheckbox, PrimeInput, PrimeLabel, PrimeTextarea } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { InternationalPhoneInput } from "@/components/ui/InternationalPhoneInput";

type CandidateProfile = {
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  city?: string | null;
  professional_title?: string | null;
  bio?: string | null;
};

type ProfileCompletion = {
  completed: boolean;
  completionPercent: number;
  missing: string[];
};

type DocumentVersionRow = {
  id: string;
  document_type: string;
  version_number: number;
  original_filename: string;
  verification_status: string;
  is_active: boolean;
  created_at: string;
};

type DocumentCaseRow = {
  id: string;
  status: string;
  priority: string;
  candidate_message?: string | null;
  created_at: string;
  updated_at: string;
};

type CandidateVerificationTimeline = {
  versions: DocumentVersionRow[];
  cases: DocumentCaseRow[];
};

const REQUIREMENT_LABELS: Record<string, { en: string; ar: string }> = {
  cv: { en: "Upload your CV", ar: "حمّل السيرة الذاتية" },
  diploma: { en: "Upload at least one diploma or certificate", ar: "حمّل دبلوما أو شهادة واحدة على الأقل" },
  summary: { en: "Complete your professional summary", ar: "أكمل الملخص المهني" },
  skills: { en: "Add your skills", ar: "أضف المهارات" },
  experience: { en: "Add work experience", ar: "أضف الخبرات العملية" },
  education: { en: "Add education entries", ar: "أضف بيانات التعليم" },
  languages: { en: "Add your languages", ar: "أضف اللغات" },
  country: { en: "Select your country", ar: "اختر بلدك" },
  phone: { en: "Enter a valid international phone number", ar: "أدخل رقم هاتف دولي صحيح" },
};

function labelForRequirement(key: string, locale: "en" | "ar") {
  return REQUIREMENT_LABELS[key]?.[locale] ?? key;
}

export default function CandidateOnboardingPage() {
  const locale = useLocale();
  const tDoc = useTranslations("candidateDocumentVerification");
  const isArabic = locale === "ar";
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [verificationTimeline, setVerificationTimeline] = useState<CandidateVerificationTimeline | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    city: "",
    countryCode: "",
    phoneRaw: "",
    phoneE164: "",
    desiredPosition: "",
    experienceLevel: "",
    shortBio: "",
    skills: "",
    languages: "",
    education: "",
    jobAlertsEnabled: true,
  });

  const missingLabels = useMemo(
    () => (completion?.missing ?? []).map((item) => labelForRequirement(item, isArabic ? "ar" : "en")),
    [completion, isArabic]
  );

  async function loadCompletion() {
    const response = await fetch("/api/candidates/profile-completion", { credentials: "include" });
    const payload = await response.json();
    if (response.ok && payload?.success) {
      setCompletion(payload.data as ProfileCompletion);
    }
  }

  async function loadVerificationTimeline() {
    const response = await fetch("/api/candidates/document-verification", { credentials: "include" });
    const payload = await response.json();
    if (response.ok && payload?.success) {
      setVerificationTimeline({
        versions: Array.isArray(payload?.data?.versions) ? payload.data.versions : [],
        cases: Array.isArray(payload?.data?.cases) ? payload.data.cases : [],
      });
    }
  }

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    Promise.all([
      fetch("/api/auth/me", { credentials: "include" }),
      fetch("/api/candidates/profile", { credentials: "include" }),
      fetch("/api/candidates/professional-profile", { credentials: "include" }),
      fetch("/api/candidates/profile-completion", { credentials: "include" }),
      fetch("/api/candidates/document-verification", { credentials: "include" }),
    ])
      .then(async ([authResponse, profileResponse, professionalResponse, completionResponse, verificationResponse]) => {
        const [authPayload, profilePayload, professionalPayload, completionPayload, verificationPayload] = await Promise.all([
          authResponse.json(),
          profileResponse.json(),
          professionalResponse.json(),
          completionResponse.json(),
          verificationResponse.json(),
        ]);

        if (!authResponse.ok || !authPayload?.success || authPayload?.data?.role !== "candidate") {
          setError(isArabic ? "هذه الصفحة مخصصة للمرشحين المسجلين فقط." : "This page is only for authenticated candidates.");
          return;
        }

        if (!profileResponse.ok || !profilePayload?.success) {
          setError(profilePayload?.error?.message ?? (isArabic ? "تعذر تحميل الملف الشخصي." : "Unable to load profile."));
          return;
        }

        const nextProfile = (profilePayload.data ?? null) as CandidateProfile | null;
        const professional = (professionalPayload?.data ?? {}) as Record<string, unknown>;
        setVerificationTimeline({
          versions: Array.isArray(verificationPayload?.data?.versions) ? verificationPayload.data.versions : [],
          cases: Array.isArray(verificationPayload?.data?.cases) ? verificationPayload.data.cases : [],
        });

        setProfile(nextProfile);
        setCompletion(completionPayload?.data ?? null);
        setForm((prev) => ({
          ...prev,
          city: String(nextProfile?.city ?? ""),
          countryCode: String(nextProfile?.country ?? ""),
          phoneRaw: String(nextProfile?.phone_number ?? ""),
          phoneE164: String(nextProfile?.phone_number ?? ""),
          desiredPosition: String(nextProfile?.professional_title ?? professional?.headline ?? ""),
          shortBio: String(nextProfile?.bio ?? professional?.biography ?? ""),
          skills: Array.isArray(professional?.skills) ? (professional.skills as string[]).join(", ") : "",
          languages: Array.isArray(professional?.languages) ? (professional.languages as string[]).join(", ") : "",
          education: Array.isArray(professional?.education_entries) ? String((professional.education_entries as unknown[]).length) : "",
        }));
      })
      .catch(() => setError(isArabic ? "تعذر تحميل بيانات الإعداد." : "Unable to load onboarding data."))
      .finally(() => setLoading(false));
  }, [isArabic]);

  async function uploadDocuments() {
    const notices: string[] = [];

    if (cvFile) {
      const cvData = new FormData();
      cvData.append("file", cvFile);
      const cvResponse = await fetch("/api/candidates/resumes", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body: cvData,
      });
      const cvPayload = await cvResponse.json();
      if (!cvResponse.ok || !cvPayload?.success) {
        throw new Error(cvPayload?.error?.message ?? "Failed to upload CV");
      }

      if (typeof cvPayload?.verification?.message === "string" && cvPayload.verification.message.trim()) {
        notices.push(cvPayload.verification.message.trim());
      }
    }

    if (supportingFiles.length > 0) {
      const docsData = new FormData();
      supportingFiles.forEach((file) => docsData.append("files", file));
      const docsResponse = await fetch("/api/candidates/private-documents", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body: docsData,
      });
      const docsPayload = await docsResponse.json();
      if (!docsResponse.ok || !docsPayload?.success) {
        throw new Error(docsPayload?.error?.message ?? "Failed to upload supporting documents");
      }

      if (typeof docsPayload?.verification?.message === "string" && docsPayload.verification.message.trim()) {
        notices.push(docsPayload.verification.message.trim());
      }
    }

    return notices;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setVerificationNotice(null);

    const skills = form.skills
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const languages = form.languages
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!form.countryCode) {
      setError(isArabic ? "يرجى اختيار الدولة." : "Please select your country.");
      setSaving(false);
      return;
    }

    if (!form.phoneE164) {
      setError(isArabic ? "يرجى إدخال رقم هاتف دولي صحيح." : "Please enter a valid international phone number.");
      setSaving(false);
      return;
    }

    try {
      const notices = await uploadDocuments();
      if (notices.length > 0) {
        setVerificationNotice(Array.from(new Set(notices)).join(" "));
      }

      const profileResponse = await fetch("/api/candidates/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          fullName: profile.full_name ?? "",
          email: profile.email ?? "",
          phoneNumber: form.phoneE164,
          country: form.countryCode,
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
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          headline: form.desiredPosition,
          biography: form.shortBio,
          experiences: form.experienceLevel ? [{ company: "Prime Global", role: form.desiredPosition || "Candidate", startDate: "2020", summary: form.experienceLevel }] : [],
          educationEntries: form.education ? [{ institution: "Provided by candidate", degree: "Qualification", year: form.education }] : [],
          certificates: [],
          skills,
          languages,
          portfolioUrl: "",
          linkedInUrl: "",
          websiteUrl: "",
          availability: "",
          nationality: form.countryCode,
        }),
      });

      const professionalPayload = await professionalResponse.json();
      if (!professionalResponse.ok || !professionalPayload?.success) {
        setError(professionalPayload?.error?.message ?? (isArabic ? "تعذر حفظ الملف المهني." : "Unable to save professional profile."));
        return;
      }

      const alertsResponse = await fetch("/api/candidates/job-alert-preferences", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          desiredJobTitles: form.desiredPosition ? [form.desiredPosition] : [],
          relatedJobTitles: [],
          skills,
          experienceLevel: form.experienceLevel || null,
          industry: null,
          country: form.countryCode || null,
          city: form.city || null,
          workModePreference: "any",
          languages,
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

      await loadCompletion();
      await loadVerificationTimeline();
      const completionResponse = await fetch("/api/candidates/profile-completion", { credentials: "include" });
      const completionPayload = await completionResponse.json();
      const nextCompletion = completionPayload?.data as ProfileCompletion | undefined;
      if (completionResponse.ok && nextCompletion?.completed) {
        router.push("/candidate/dashboard");
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isArabic
            ? "حدث خطأ غير متوقع أثناء الحفظ."
            : "Unexpected error while saving your onboarding."
      );
    } finally {
      setSaving(false);
    }
  }

  const latestCase = verificationTimeline?.cases?.[0] ?? null;

  function statusLabel(status: string) {
    if (status === "pending_manual_review") return tDoc("status.pendingManualReview");
    if (status === "verified" || status === "auto_approved") return tDoc("status.verified");
    if (status === "additional_evidence_requested") return tDoc("status.additionalEvidenceRequired");
    if (status === "replacement_requested") return tDoc("status.replacementRequired");
    if (status === "live_verification_required") return tDoc("status.liveVerificationRequired");
    if (status === "rejected") return tDoc("status.couldNotBeVerified");
    if (status === "superseded") return tDoc("status.replaced");
    if (status === "escalated") return tDoc("status.pendingManualReview");
    return tDoc("status.received");
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-blue-200/20 bg-[#081223]/82 p-8 text-sm text-text-secondary backdrop-blur-xl">
          {isArabic ? "جارٍ تحميل الإعداد الأولي..." : "Loading onboarding..."}
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
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
    <main className="mx-auto w-full max-w-[860px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8 md:p-10">
        <PrimePageTitle>{isArabic ? "أكمل ملفك المهني" : "Complete your professional profile"}</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "لا يمكن طلب أو دخول المقابلات قبل اكتمال الملف المهني. تظل الوثائق الأصلية خاصة ولا تُعرض مباشرة لأصحاب العمل."
            : "Interview actions stay blocked until your professional profile is complete. Original documents remain private and are never directly exposed to employers."}
        </p>

        {verificationNotice ? (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-100/10 px-4 py-3 text-sm text-amber-100">
            {verificationNotice}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <h2 className="font-heading text-xl text-text-primary">{tDoc("panel.title")}</h2>
          <p className="mt-2 text-sm text-text-secondary">{tDoc("panel.subtitle")}</p>

          <div className="mt-3 rounded-xl border border-blue-200/20 bg-[#081223]/70 px-4 py-3 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">{tDoc("panel.currentStatus")}</p>
            <p className="mt-1">{statusLabel(latestCase?.status ?? "pending_manual_review")}</p>
            {latestCase?.candidate_message ? <p className="mt-2 text-amber-100">{latestCase.candidate_message}</p> : null}
          </div>

          <div className="mt-3 space-y-2 text-sm text-text-secondary">
            <p>{tDoc("panel.historyPreserved")}</p>
            <p>{tDoc("panel.uploadReplacement")}</p>
            <p>{tDoc("panel.submitAdditionalEvidence")}</p>
          </div>

          {verificationTimeline?.versions?.length ? (
            <div className="mt-4 space-y-2">
              {verificationTimeline.versions.slice(0, 5).map((version) => (
                <div key={version.id} className="rounded-xl border border-blue-200/20 bg-[#081223]/70 px-4 py-3 text-sm text-text-secondary">
                  <p className="font-medium text-text-primary">
                    {version.document_type.toUpperCase()} v{version.version_number}
                  </p>
                  <p>{statusLabel(version.verification_status)}</p>
                  {version.is_active ? <p className="text-emerald-200">{tDoc("status.verified")}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <p className="text-sm text-text-secondary">
            {isArabic ? "نسبة اكتمال الملف" : "Profile completion"}: <span className="font-semibold text-slate-100">{completion?.completionPercent ?? 0}%</span>
          </p>
          {missingLabels.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-amber-100">
              {missingLabels.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-200">{isArabic ? "ملفك مكتمل ويمكنك المتابعة إلى المقابلات." : "Your profile is complete and interview access is enabled."}</p>
          )}
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "الدولة" : "Country"}</span>
              <CountrySelector
                locale={isArabic ? "ar" : "en"}
                value={form.countryCode}
                onChange={(countryCode) => setForm((prev) => ({ ...prev, countryCode }))}
                placeholder={isArabic ? "ابحث عن الدولة" : "Search country"}
              />
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "رقم الهاتف الدولي" : "International phone number"}</span>
              <InternationalPhoneInput
                locale={isArabic ? "ar" : "en"}
                countryCode={form.countryCode || "SA"}
                value={form.phoneRaw}
                onCountryCodeChange={(nextCode) => setForm((prev) => ({ ...prev, countryCode: nextCode }))}
                onChange={(phoneRaw, phoneE164) => setForm((prev) => ({ ...prev, phoneRaw, phoneE164 }))}
                placeholder={isArabic ? "مثال: +966 5XXXXXXXX" : "Example: +966 5XXXXXXXX"}
              />
            </PrimeLabel>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المدينة" : "City"}</span>
              <PrimeInput value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المنصب المطلوب" : "Desired position"}</span>
              <PrimeInput required value={form.desiredPosition} onChange={(event) => setForm((prev) => ({ ...prev, desiredPosition: event.target.value }))} />
            </PrimeLabel>
          </div>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "الخبرة العملية" : "Work experience"}</span>
            <PrimeInput value={form.experienceLevel} onChange={(event) => setForm((prev) => ({ ...prev, experienceLevel: event.target.value }))} />
          </PrimeLabel>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "الملخص المهني" : "Professional summary"}</span>
            <PrimeTextarea rows={5} value={form.shortBio} onChange={(event) => setForm((prev) => ({ ...prev, shortBio: event.target.value }))} />
          </PrimeLabel>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المهارات" : "Skills"}</span>
              <PrimeInput value={form.skills} onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))} placeholder={isArabic ? "مفصولة بفواصل" : "Comma separated"} />
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "اللغات" : "Languages"}</span>
              <PrimeInput value={form.languages} onChange={(event) => setForm((prev) => ({ ...prev, languages: event.target.value }))} placeholder={isArabic ? "مثال: العربية, الإنجليزية" : "Example: Arabic, English"} />
            </PrimeLabel>
          </div>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "بيانات التعليم" : "Education"}</span>
            <PrimeInput value={form.education} onChange={(event) => setForm((prev) => ({ ...prev, education: event.target.value }))} placeholder={isArabic ? "مثال: بكالوريوس 2020" : "Example: Bachelor 2020"} />
          </PrimeLabel>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "تحميل السيرة الذاتية" : "Upload CV"}</span>
              <PrimeInput type="file" accept=".pdf,.doc,.docx" onChange={(event) => setCvFile(event.target.files?.[0] ?? null)} />
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "تحميل الشهادات/الدبلومات" : "Upload diplomas/certificates"}</span>
              <PrimeInput
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={(event) => setSupportingFiles(Array.from(event.target.files ?? []))}
              />
            </PrimeLabel>
          </div>

          <label className="flex min-h-12 items-start gap-3 rounded-2xl border border-blue-200/20 bg-[#071428]/75 px-4 py-3 text-sm text-text-secondary">
            <PrimeCheckbox type="checkbox" checked={form.jobAlertsEnabled} onChange={(event) => setForm((prev) => ({ ...prev, jobAlertsEnabled: event.target.checked }))} />
            <span>{isArabic ? "تفعيل تنبيهات الوظائف المناسبة لملفي." : "Enable matching job alerts."}</span>
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button type="submit" disabled={saving || !csrfToken} className={primeButtonClasses("primary")}>
            {saving ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : isArabic ? "حفظ ومتابعة" : "Save and continue"}
          </button>
        </form>
      </PrimeCard>
    </main>
  );
}
