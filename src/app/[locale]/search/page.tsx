"use client";

import { FormEvent, useState } from "react";

interface SearchData {
  jobs: Array<Record<string, unknown>>;
  employers: Array<Record<string, unknown>>;
  candidates: Array<Record<string, unknown>>;
}

export default function GlobalSearchPage() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [skill, setSkill] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [visa, setVisa] = useState("");
  const [nationality, setNationality] = useState("");
  const [results, setResults] = useState<SearchData>({ jobs: [], employers: [], candidates: [] });

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (country) params.set("country", country);
    if (skill) params.set("skill", skill);
    if (experience) params.set("experience", experience);
    if (education) params.set("education", education);
    if (salaryMin) params.set("salaryMin", salaryMin);
    if (visa) params.set("visa", visa);
    if (nationality) params.set("nationality", nationality);

    const response = await fetch(`/api/search/global?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok || !payload.success) return;

    setResults(payload.data);
  }

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Global Talent Search</h1>
        <p className="mt-3 text-sm text-text-secondary">
          Search by skill, job, country, company, language, experience, education, salary, visa, and nationality.
        </p>

        <form className="mt-8 grid gap-4 md:grid-cols-4" onSubmit={onSearch}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job or company" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Skill" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Experience" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Education" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="Min Salary" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={visa} onChange={(e) => setVisa(e.target.value)} placeholder="Visa" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Nationality" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <button type="submit" className="md:col-span-4 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">Search</button>
        </form>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-gold/15 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Jobs</h2>
            <p className="mt-2 text-sm text-gold">{results.jobs.length} results</p>
          </section>
          <section className="rounded-2xl border border-gold/15 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Companies</h2>
            <p className="mt-2 text-sm text-gold">{results.employers.length} results</p>
          </section>
          <section className="rounded-2xl border border-gold/15 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Candidates</h2>
            <p className="mt-2 text-sm text-gold">{results.candidates.length} results</p>
          </section>
        </div>
      </section>
    </main>
  );
}
