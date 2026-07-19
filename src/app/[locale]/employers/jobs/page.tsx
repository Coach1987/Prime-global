"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";

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

type JobInsight = {
  id: string;
  title: string;
  country: string;
  city: string;
  employmentType: string;
  experience: string;
  requiredSkills: string[];
  preferredSkills: string[];
  languages: string[];
  aiJobAnalysis: {
    matchCount: number;
    averageMatchScore: number;
    strongestSignals: string[];
    riskSignals: string[];
    lastMatchingTime: string | null;
  };
};

export default function EmployerJobsPage() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [insights, setInsights] = useState<JobInsight[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    country: "",
    city: "",
    employmentType: "full_time",
    experience: "2+ years",
    requiredSkills: "Communication, Teamwork",
  });

  async function load() {
    const [jobsRes, insightsRes] = await Promise.all([
      fetch("/api/employers/jobs", { credentials: "include" }),
      fetch("/api/employers/matches", { credentials: "include" }),
    ]);

    const [jobsPayload, insightsPayload] = await Promise.all([jobsRes.json(), insightsRes.json()]);
    if (jobsRes.ok && jobsPayload?.success) setJobs(jobsPayload.data ?? []);
    if (insightsRes.ok && insightsPayload?.success) setInsights(insightsPayload.data?.jobs ?? []);
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

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      setMessage(payload?.error?.message ?? "Unable to create job");
      return;
    }

    setMessage("Job created as draft.");
    await load();
    setForm((current) => ({ ...current, title: "" }));
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

    setMessage(`Job ${status}.`);
    await load();
  }

  if (loading) return <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">Loading jobs...</main>;

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">Employer Job Portal</h1>
        <p className="mt-3 text-sm text-text-secondary">Create, analyze, and publish jobs with advisory AI matching insights.</p>
        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}

        <form onSubmit={createJob} className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Job details: title" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} placeholder="Country" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={form.experience} onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))} placeholder="Experience" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={form.requiredSkills} onChange={(event) => setForm((current) => ({ ...current, requiredSkills: event.target.value }))} placeholder="Required skills (comma separated)" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <button type="submit" className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">Create Draft</button>
        </form>

        <div className="mt-8 space-y-4">
          {jobs.map((job) => {
            const insight = insights.find((item) => item.id === job.id);
            return (
              <article key={job.id} className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl text-text-primary">{job.title}</h2>
                    <p className="text-sm text-text-secondary">{job.city}, {job.country} · {job.employment_type}</p>
                  </div>
                  <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">{job.status}</span>
                </div>

                <div className="mt-4 grid gap-5 lg:grid-cols-2 text-sm text-text-secondary">
                  <div>
                    <p>Required skills: {(insight?.requiredSkills ?? job.required_skills ?? []).join(", ") || "-"}</p>
                    <p className="mt-2">Preferred skills: {(insight?.preferredSkills ?? []).join(", ") || "-"}</p>
                    <p className="mt-2">Languages: {(insight?.languages ?? []).map((entry) => {
                      if (typeof entry === "string") return entry;
                      return String((entry as Record<string, unknown>).languageName ?? "");
                    }).filter(Boolean).join(", ") || "-"}</p>
                    <p className="mt-2">Experience: {insight?.experience ?? job.experience ?? "-"}</p>
                  </div>
                  <div>
                    <p>AI job analysis: {insight?.aiJobAnalysis.matchCount ?? 0} candidate matches</p>
                    <p className="mt-2">Average match score: {insight?.aiJobAnalysis.averageMatchScore ?? 0}</p>
                    <p className="mt-2">Strongest signals: {(insight?.aiJobAnalysis.strongestSignals ?? []).join(", ") || "-"}</p>
                    <p className="mt-2">Risk signals: {(insight?.aiJobAnalysis.riskSignals ?? []).join(", ") || "-"}</p>
                    <p className="mt-2">Last matching time: {insight?.aiJobAnalysis.lastMatchingTime ? new Date(insight.aiJobAnalysis.lastMatchingTime).toLocaleString(locale) : "-"}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setStatus(job.id, "published")} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10">Publish Job</button>
                  <button type="button" onClick={() => setStatus(job.id, "paused")} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10">Pause Job</button>
                  <a href={`/${locale}/employers/candidate-profiles`} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10">Review Candidates</a>
                  <a href={`/${locale}/employers/workflow`} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10">Track Workflow</a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
