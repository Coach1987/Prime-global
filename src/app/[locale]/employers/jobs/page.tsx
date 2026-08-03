"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  employerInput,
  employerPageShell,
  employerPrimaryButton,
  employerSecondaryButton,
  employerSectionCard,
  employerSurfaceCard,
} from "@/features/employers/ui/portal-theme";

type JobItem = {
  id: string;
  title: string;
  country: string;
  city: string;
  status: string;
  employment_type: string;
  experience: string;
  required_skills: string[];
};

export default function EmployerJobsPage() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  type ApiValidationResponse = {
    success?: boolean;
    error?: {
      message?: string;
    };
    details?: {
      messageAr?: string;
      fieldErrors?: Record<string, string>;
      localizedFieldErrors?: Record<string, { en?: string; ar?: string }>;
    };
  };

  const isArabic = locale === "ar";

  function resolveValidationMessage(payload: ApiValidationResponse | null, fallback: string) {
    return isArabic ? payload?.details?.messageAr ?? fallback : payload?.error?.message ?? fallback;
  }

  function resolveValidationFieldErrors(payload: ApiValidationResponse | null) {
    const localizedFieldErrors = payload?.details?.localizedFieldErrors ?? {};
    const fieldErrors = payload?.details?.fieldErrors ?? {};
    const fieldNames = new Set([...Object.keys(localizedFieldErrors), ...Object.keys(fieldErrors)]);
    const resolvedErrors: Record<string, string> = {};

    for (const fieldName of fieldNames) {
      const localized = localizedFieldErrors[fieldName];
      const message = isArabic ? localized?.ar ?? fieldErrors[fieldName] : localized?.en ?? fieldErrors[fieldName];

      if (message) {
        resolvedErrors[fieldName] = message;
      }
    }

    return resolvedErrors;
  }

  const [form, setForm] = useState({
    title: "",
    country: "",
    city: "",
    employmentType: "full_time",
    experience: "2+ years",
    requiredSkills: "Communication, Teamwork",
  });

  async function load() {
    const jobsRes = await fetch("/api/employers/jobs", { credentials: "include" });
    const jobsPayload = await jobsRes.json();
    if (jobsRes.ok && jobsPayload?.success) {
      setJobs(jobsPayload.data ?? []);
      return;
    }
    setJobs([]);
  }

  useEffect(() => {
    Promise.all([fetch("/api/security/csrf"), load()])
      .then(async ([csrfRes]) => {
        const csrfPayload = await csrfRes.json();
        if (csrfRes.ok && csrfPayload?.success) setCsrfToken(csrfPayload?.data?.csrfToken ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});

    const requiredSkills = form.requiredSkills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch("/api/employers/jobs", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        title: form.title,
        department: "General",
        employmentType: form.employmentType,
        workMode: "onsite",
        country: form.country,
        city: form.city,
        salaryCurrency: "USD",
        experience: form.experience,
        education: "Bachelor",
        requiredSkills,
        responsibilities: "Role responsibilities will be finalized by employer and Prime Global review.",
        requirements: "Role requirements aligned with employer and Prime Global hiring quality standards.",
        benefits: "Competitive package",
        status: "draft",
      }),
    });

    const payload = (await response.json()) as ApiValidationResponse;
    if (!response.ok || !payload?.success) {
      setFieldErrors(resolveValidationFieldErrors(payload));
      setMessage(resolveValidationMessage(payload, "Unable to create job"));
      return;
    }

    setMessage(isArabic ? "تم إنشاء الوظيفة كمسودة." : "Job created as draft.");
    setShowCreateForm(false);
    await load();
    setForm((current) => ({ ...current, title: "", country: "", city: "" }));
  }

  async function setStatus(jobId: string, status: "published" | "paused") {
    setMessage(null);
    const response = await fetch(`/api/employers/jobs/${jobId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ status }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      setMessage(payload?.error?.message ?? "Unable to update job status");
      return;
    }

    setMessage(status === "published" ? (isArabic ? "تم نشر الوظيفة." : "Job published.") : (isArabic ? "تم إيقاف الوظيفة." : "Job paused."));
    await load();
  }

  if (loading) return <main className={employerPageShell}>{isArabic ? "جارٍ تحميل الوظائف..." : "Loading jobs..."}</main>;

  return (
    <main className={employerPageShell}>
      <section className={employerSurfaceCard}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl text-text-primary">{isArabic ? "الوظائف" : "Jobs"}</h1>
            <p className="mt-2 text-sm text-text-secondary">{isArabic ? "إدارة وظائف الشركة ونشرها." : "Create and manage your company jobs."}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className={employerSecondaryButton}
          >
            {showCreateForm ? (isArabic ? "إغلاق" : "Close") : (isArabic ? "إنشاء وظيفة" : "Create Job")}
          </button>
        </div>

        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}

        {showCreateForm ? (
          <form onSubmit={createJob} className={`mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${employerSectionCard}`}>
            <label className="block">
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={isArabic ? "عنوان الوظيفة" : "Job title"} required className={employerInput} />
              {fieldErrors.title ? <p className="mt-1 text-xs text-red-300">{fieldErrors.title}</p> : null}
            </label>
            <label className="block">
              <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} placeholder={isArabic ? "الدولة" : "Country"} required className={employerInput} />
              {fieldErrors.country ? <p className="mt-1 text-xs text-red-300">{fieldErrors.country}</p> : null}
            </label>
            <label className="block">
              <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder={isArabic ? "المدينة" : "City"} required className={employerInput} />
              {fieldErrors.city ? <p className="mt-1 text-xs text-red-300">{fieldErrors.city}</p> : null}
            </label>
            <label className="block">
              <input value={form.experience} onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))} placeholder={isArabic ? "الخبرة" : "Experience"} required className={employerInput} />
              {fieldErrors.experience ? <p className="mt-1 text-xs text-red-300">{fieldErrors.experience}</p> : null}
            </label>
            <label className="block">
              <input value={form.requiredSkills} onChange={(event) => setForm((current) => ({ ...current, requiredSkills: event.target.value }))} placeholder={isArabic ? "المهارات المطلوبة" : "Required skills (comma separated)"} required className={employerInput} />
              {fieldErrors.requiredSkills ? <p className="mt-1 text-xs text-red-300">{fieldErrors.requiredSkills}</p> : null}
            </label>
            <button type="submit" className={employerPrimaryButton}>{isArabic ? "حفظ كمسودة" : "Create Draft"}</button>
          </form>
        ) : null}

        {Object.keys(fieldErrors).length > 0 ? (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            <p className="font-semibold">{isArabic ? "يرجى مراجعة الحقول التالية:" : "Please review the following fields:"}</p>
            <ul className="mt-2 space-y-1">
              {Object.entries(fieldErrors).map(([fieldName, fieldMessage]) => (
                <li key={fieldName}>
                  <span className="font-semibold">{fieldName}</span>: {fieldMessage}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          {jobs.length === 0 ? (
            <article className={`${employerSectionCard} text-sm text-text-secondary`}>
              {isArabic ? "لم يتم إنشاء وظائف بعد." : "No jobs created yet."}
            </article>
          ) : null}
          {jobs.map((job) => {
            return (
              <article key={job.id} className={employerSectionCard}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl text-text-primary">{job.title}</h2>
                    <p className="text-sm text-text-secondary">{job.city}, {job.country}</p>
                  </div>
                  <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">{job.status}</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setStatus(job.id, "published")} className={employerSecondaryButton}>{isArabic ? "نشر" : "Publish"}</button>
                  <button type="button" onClick={() => setStatus(job.id, "paused")} className={employerSecondaryButton}>{isArabic ? "إيقاف" : "Pause"}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
