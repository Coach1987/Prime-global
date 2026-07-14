"use client";

import { FormEvent, useEffect, useState } from "react";

type PublicJob = {
  id: string;
  title: string;
  country: string;
  city: string;
  employment_type: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  employers?: { company_name?: string }[] | { company_name?: string };
};

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [sort, setSort] = useState("newest");

  async function loadJobs(params?: URLSearchParams) {
    const queryString = params ? `?${params.toString()}` : "";
    const response = await fetch(`/api/jobs${queryString}`);
    const payload = await response.json();
    if (!response.ok || !payload.success) return;
    setJobs(payload.data ?? []);
  }

  useEffect(() => {
    loadJobs().catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (country) params.set("country", country);
    if (employmentType) params.set("employmentType", employmentType);
    if (workMode) params.set("workMode", workMode);
    params.set("sort", sort);

    await loadJobs(params);
  }

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Prime Global Jobs</h1>
        <p className="mt-2 text-sm text-text-secondary">Discover premium opportunities with advanced filters.</p>

        <form className="mt-8 grid gap-4 md:grid-cols-5" onSubmit={onSubmit}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs"
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          />
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Country"
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          />
          <select
            value={employmentType}
            onChange={(event) => setEmploymentType(event.target.value)}
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          >
            <option value="">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          <select
            value={workMode}
            onChange={(event) => setWorkMode(event.target.value)}
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          >
            <option value="">All Modes</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On Site</option>
          </select>
          <div className="flex gap-3">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
            >
              <option value="newest">Newest</option>
              <option value="relevant">Most Relevant</option>
              <option value="highest_salary">Highest Salary</option>
            </select>
            <button className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary" type="submit">
              Filter
            </button>
          </div>
        </form>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {jobs.map((job) => {
            const employer = Array.isArray(job.employers) ? job.employers[0] : job.employers;
            return (
              <article key={job.id} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-gold">{employer?.company_name ?? "Verified Employer"}</p>
                <h2 className="mt-3 font-heading text-2xl text-text-primary">{job.title}</h2>
                <p className="mt-2 text-sm text-text-secondary">{job.city}, {job.country}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.15em] text-text-tertiary">
                  {job.employment_type.replace("_", " ")} | {job.work_mode}
                </p>
                <p className="mt-4 text-sm text-gold">
                  Salary: {job.salary_min ?? "-"} - {job.salary_max ?? "-"}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
