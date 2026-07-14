"use client";

import { FormEvent, useEffect, useState } from "react";

export default function CompanyVerificationPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    setToken(localStorage.getItem("prime_auth_token") ?? "");
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch("/api/companies/verification", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setStatus(payload?.data ?? []))
      .catch(() => undefined);
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/companies/verification", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) return;
    event.currentTarget.reset();
  }

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Company Verification</h1>
        <p className="mt-3 text-sm text-text-secondary">Pending, approved, rejected, and suspended verification flow.</p>

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          {[
            ["companyName", "Company Name"],
            ["commercialRegistrationNumber", "Commercial Registration Number"],
            ["taxNumber", "Tax Number"],
            ["country", "Country"],
            ["address", "Address"],
            ["officialEmail", "Official Email"],
            ["website", "Website"],
            ["phoneNumber", "Phone Number"],
            ["responsiblePerson", "Responsible Person"],
          ].map(([name, label]) => (
            <label key={name} className="block text-sm text-text-secondary">
              <span className="mb-2 block">{label}</span>
              <input name={name} className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary" />
            </label>
          ))}
          <input name="documents" type="file" multiple className="md:col-span-2 rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary" />
          <button type="submit" className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary md:col-span-2">Submit Verification</button>
        </form>

        <div className="mt-8 space-y-3">
          {status.map((item) => (
            <article key={String(item.id)} className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-4">
              <p className="font-medium text-text-primary">{String(item.company_name ?? item.companyName ?? "Verification Request")}</p>
              <p className="mt-1 text-sm text-text-secondary">Status: {String(item.status ?? "pending")}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
