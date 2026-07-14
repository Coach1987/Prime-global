"use client";

import { FormEvent, useEffect, useState } from "react";

const regionOptions = ["Middle East", "Europe", "North America", "Asia Pacific", "Africa"];

export default function PartnerJobRequestPage() {
  const [csrfToken, setCsrfToken] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      companyName: String(formData.get("companyName") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      companyWebsite: String(formData.get("companyWebsite") ?? ""),
      country: String(formData.get("country") ?? ""),
      targetHiringRegions: formData.getAll("targetHiringRegions").map((value) => String(value)),
      jobTitles: String(formData.get("jobTitles") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      headcount: Number(formData.get("headcount") ?? 1),
      budgetRange: String(formData.get("budgetRange") ?? ""),
      timeline: String(formData.get("timeline") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };

    const response = await fetch("/api/partner-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setSubmitted(true);
      event.currentTarget.reset();
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Job Request Partners</p>
        <h1 className="mt-4 font-heading text-4xl text-text-primary">Request Hiring Support From Prime Global</h1>
        <p className="mt-4 max-w-3xl text-sm text-text-secondary">
          Share your hiring brief and our enterprise team will review the request, scope the search, and route it into the premium recruitment workflow.
        </p>

        {submitted ? <p className="mt-6 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">Request submitted successfully.</p> : null}

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          {[
            ["companyName", "Company Name"],
            ["contactName", "Contact Name"],
            ["contactEmail", "Contact Email"],
            ["contactPhone", "Contact Phone"],
            ["companyWebsite", "Company Website"],
            ["country", "Country"],
            ["jobTitles", "Job Titles (comma separated)"],
            ["headcount", "Headcount"],
            ["budgetRange", "Budget Range"],
            ["timeline", "Timeline"],
          ].map(([name, label]) => (
            <label key={name} className="block text-sm text-text-secondary">
              <span className="mb-2 block">{label}</span>
              <input
                name={name}
                type={name === "headcount" ? "number" : "text"}
                min={name === "headcount" ? 1 : undefined}
                className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
                required={name !== "contactPhone" && name !== "companyWebsite" && name !== "budgetRange" && name !== "timeline"}
              />
            </label>
          ))}
          <label className="block text-sm text-text-secondary md:col-span-2">
            <span className="mb-2 block">Target Hiring Regions</span>
            <select name="targetHiringRegions" multiple className="min-h-32 w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary">
              {regionOptions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-text-secondary md:col-span-2">
            <span className="mb-2 block">Notes</span>
            <textarea name="notes" rows={5} className="w-full rounded-2xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary" />
          </label>
          <button type="submit" className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary md:col-span-2">Submit Request</button>
        </form>
      </section>
    </main>
  );
}
