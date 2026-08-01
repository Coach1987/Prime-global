"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

type EmployerStats = {
  totalJobs: number;
  publishedJobs: number;
  totalApplicants: number;
  verificationStatus: string;
  accountStatus?: "pending_review" | "approved" | "rejected" | "suspended" | null;
};

type Job = {
  id: string;
  title: string;
  country: string;
  city: string;
  status: string;
  created_at: string;
};

export default function EmployerDashboardPage() {
  const [hasSession, setHasSession] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [stats, setStats] = useState<EmployerStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [jobTitle, setJobTitle] = useState("");
  const [jobCountry, setJobCountry] = useState("");
  const [jobCity, setJobCity] = useState("");
  const locale = useLocale();

  function statusLabel(status: EmployerStats["accountStatus"], verificationStatus: string) {
    if (status === "approved" || verificationStatus === "verified") return "Approved";
    if (status === "rejected" || verificationStatus === "rejected") return "Rejected";
    if (status === "suspended" || verificationStatus === "suspended") return "Suspended";
    return "Pending Review";
  }

  const isReady = useMemo(() => hasSession, [hasSession]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setHasSession(Boolean(payload?.success && payload?.data?.role === "employer")))
      .catch(() => setHasSession(false));

    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  useEffect(() => {
    if (!isReady) return;

    Promise.all([
      fetch("/api/employers/stats", { credentials: "include" }),
      fetch("/api/employers/jobs", { credentials: "include" }),
      fetch("/api/employers/applicants", { credentials: "include" }),
    ])
      .then(async ([statsRes, jobsRes, applicantsRes]) => {
        const [statsPayload, jobsPayload, applicantsPayload] = await Promise.all([
          statsRes.json(),
          jobsRes.json(),
          applicantsRes.json(),
        ]);

        if (!statsRes.ok || !jobsRes.ok) {
          setError("Failed to load dashboard data");
          return;
        }

        setStats(statsPayload.data ?? null);
        setJobs(jobsPayload.data ?? []);

        if (applicantsRes.ok) {
          setApplicants(applicantsPayload.data ?? []);
          return;
        }

        setApplicants([]);
      })
      .catch(() => setError("Failed to load dashboard data"));
  }, [isReady]);

  async function createDraftJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const response = await fetch("/api/employers/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        title: jobTitle,
        department: "General",
        employmentType: "full_time",
        workMode: "onsite",
        country: jobCountry,
        city: jobCity,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: "USD",
        experience: "2+ years",
        education: "Bachelor",
        requiredSkills: ["Communication"],
        responsibilities: "Manage responsibilities based on role scope.",
        requirements: "Meet role requirements and qualification profile.",
        benefits: "Competitive package",
        status: "draft",
      }),
    });

    const payload = (await response.json()) as {
      success?: boolean;
      error?: { message?: string };
      data?: Job;
      details?: {
        messageAr?: string;
        fieldErrors?: Record<string, string>;
        localizedFieldErrors?: Record<string, { en?: string; ar?: string }>;
      };
    };
    if (!response.ok || !payload.success) {
      const localizedFieldErrors = payload?.details?.localizedFieldErrors ?? {};
      const apiFieldErrors = payload?.details?.fieldErrors ?? {};
      const resolvedFieldErrors: Record<string, string> = {};

      for (const fieldName of new Set([...Object.keys(localizedFieldErrors), ...Object.keys(apiFieldErrors)])) {
        const localized = localizedFieldErrors[fieldName];
        const message = locale === "ar" ? localized?.ar ?? apiFieldErrors[fieldName] : localized?.en ?? apiFieldErrors[fieldName];
        if (message) {
          resolvedFieldErrors[fieldName] = message;
        }
      }

      setFieldErrors(resolvedFieldErrors);
      setError(locale === "ar" ? payload?.details?.messageAr ?? "تعذر إنشاء الوظيفة" : payload?.error?.message ?? "Unable to create job");
      return;
    }

    if (payload.data) {
      setJobs((prev) => [payload.data as Job, ...prev]);
    }
    setJobTitle("");
    setJobCountry("");
    setJobCity("");
  }

  async function updateJobStatus(jobId: string, status: "paused" | "published") {
    const response = await fetch(`/api/employers/jobs/${jobId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Unable to update job");
      return;
    }

    setJobs((prev) => prev.map((item) => (item.id === jobId ? { ...item, status } : item)));
  }

  async function duplicateJob(jobId: string) {
    const response = await fetch(`/api/employers/jobs/${jobId}/duplicate`, {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Unable to duplicate job");
      return;
    }

    setJobs((prev) => [payload.data, ...prev]);
  }

  async function deleteJob(jobId: string) {
    const response = await fetch(`/api/employers/jobs/${jobId}`, {
      method: "DELETE",
      headers: {
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Unable to delete job");
      return;
    }

    setJobs((prev) => prev.filter((item) => item.id !== jobId));
  }

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-16 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Employer Portal</h1>
        <p className="mt-2 text-sm text-text-secondary">Manage company profile, jobs, candidate review, interview requests, and recruitment workflow tracking.</p>

        <a href={`/${locale}/enterprise`} className="mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Open Enterprise Center
        </a>
        <a href={`/${locale}/employers/company-profile`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Company Profile
        </a>
        <a href={`/${locale}/employers/verification`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Company Verification
        </a>
        <a href={`/${locale}/employers/jobs`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Jobs
        </a>
        <a href={`/${locale}/employers/advertisements`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Advertisements
        </a>
        <a href={`/${locale}/employers/candidate-profiles`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Candidate Review
        </a>
        <a href={`/${locale}/employers/workflow`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Recruitment Workflow
        </a>
        <a href={`/${locale}/employers/interview-center`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Open Interview Center
        </a>
        <a href={`/${locale}/employers/supervised-conversations`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Supervised Conversations
        </a>

        {stats ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Verification", statusLabel(stats.accountStatus ?? null, stats.verificationStatus)],
              ["Total Jobs", String(stats.totalJobs)],
              ["Published", String(stats.publishedJobs)],
              ["Applicants", String(stats.totalApplicants)],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-gold">{value}</p>
              </article>
            ))}
          </div>
        ) : null}

        {stats && jobs.length === 0 ? (
          <p className="mt-6 text-sm text-text-secondary">{locale === "ar" ? "لم يتم إنشاء وظائف بعد." : "No jobs created yet."}</p>
        ) : null}

        {stats && applicants.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">{locale === "ar" ? "لا يوجد متقدمون حتى الآن." : "No applicants yet."}</p>
        ) : null}

        <form className="mt-10 grid gap-4 rounded-2xl border border-gold/20 bg-bg-primary/60 p-5 md:grid-cols-4" onSubmit={createDraftJob}>
          <label className="block">
            <input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Job title"
              required
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
            />
            {fieldErrors.title ? <p className="mt-1 text-xs text-red-300">{fieldErrors.title}</p> : null}
          </label>
          <label className="block">
            <input
              value={jobCountry}
              onChange={(event) => setJobCountry(event.target.value)}
              placeholder="Country"
              required
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
            />
            {fieldErrors.country ? <p className="mt-1 text-xs text-red-300">{fieldErrors.country}</p> : null}
          </label>
          <label className="block">
            <input
              value={jobCity}
              onChange={(event) => setJobCity(event.target.value)}
              placeholder="City"
              required
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
            />
            {fieldErrors.city ? <p className="mt-1 text-xs text-red-300">{fieldErrors.city}</p> : null}
          </label>
          <button type="submit" className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
            Create Job
          </button>
        </form>

        {Object.keys(fieldErrors).length > 0 ? (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            <p className="font-semibold">{locale === "ar" ? "يرجى مراجعة الحقول التالية:" : "Please review the following fields:"}</p>
            <ul className="mt-2 space-y-1">
              {Object.entries(fieldErrors).map(([fieldName, fieldMessage]) => (
                <li key={fieldName}>
                  <span className="font-semibold">{fieldName}</span>: {fieldMessage}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="mt-5 text-sm text-red-300">{error}</p> : null}

        <section className="mt-10 overflow-hidden rounded-2xl border border-gold/20">
          <table className="min-w-full divide-y divide-gold/15 text-sm">
            <thead className="bg-bg-primary/70 text-text-secondary">
              <tr>
                <th className="px-4 py-3 text-left">Job</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/10 bg-bg-secondary/50 text-text-primary">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3">{job.title}</td>
                  <td className="px-4 py-3">{job.city}, {job.country}</td>
                  <td className="px-4 py-3 capitalize">{job.status.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-full border border-gold/30 px-3 py-1" onClick={() => updateJobStatus(job.id, "published")}>Publish</button>
                      <button className="rounded-full border border-gold/30 px-3 py-1" onClick={() => updateJobStatus(job.id, "paused")}>Pause</button>
                      <button className="rounded-full border border-gold/30 px-3 py-1" onClick={() => duplicateJob(job.id)}>Duplicate</button>
                      <button className="rounded-full border border-red-400/30 px-3 py-1 text-red-200" onClick={() => deleteJob(job.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-10 rounded-2xl border border-gold/20 bg-bg-primary/60 p-6">
          <h2 className="font-heading text-2xl text-text-primary">Applicants</h2>
          <p className="mt-2 text-sm text-text-secondary">Real-time status is available through Supabase Realtime channel updates per application.</p>
          <p className="mt-4 text-sm text-gold">{applicants.length} candidates loaded</p>
        </section>
      </section>
    </main>
  );
}
