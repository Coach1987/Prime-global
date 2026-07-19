"use client";

import { FormEvent, useEffect, useState } from "react";

type EmployerProfile = {
  company_name: string;
  company_email: string;
  country: string;
  city: string;
  address: string;
  website: string | null;
  hr_contact: string;
  phone_number: string;
  industry: string;
  company_size: string;
  company_description: string;
  verification_status: string;
};

export default function EmployerCompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/security/csrf"),
      fetch("/api/employers/profile", { credentials: "include" }),
    ])
      .then(async ([csrfRes, profileRes]) => {
        const [csrfPayload, profilePayload] = await Promise.all([csrfRes.json(), profileRes.json()]);
        if (csrfRes.ok && csrfPayload?.success) setCsrfToken(csrfPayload?.data?.csrfToken ?? "");
        if (profileRes.ok && profilePayload?.success) {
          setProfile(profilePayload.data ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function updateField<K extends keyof EmployerProfile>(key: K, value: EmployerProfile[K]) {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    const response = await fetch("/api/employers/profile", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        companyName: profile.company_name,
        companyEmail: profile.company_email,
        country: profile.country,
        city: profile.city,
        address: profile.address,
        website: profile.website ?? "",
        hrContact: profile.hr_contact,
        phoneNumber: profile.phone_number,
        industry: profile.industry,
        companySize: profile.company_size,
        companyDescription: profile.company_description,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      setMessage(payload?.error?.message ?? "Unable to update company profile");
      return;
    }

    setProfile(payload.data ?? profile);
    setMessage("Company profile updated.");
  }

  if (loading) return <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">Loading company profile...</main>;
  if (!profile) return <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">Company profile unavailable.</main>;

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">Company Profile</h1>
        <p className="mt-3 text-sm text-text-secondary">Verification status: {profile.verification_status}</p>
        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input value={profile.company_name} onChange={(event) => updateField("company_name", event.target.value)} placeholder="Company name" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.company_email} onChange={(event) => updateField("company_email", event.target.value)} placeholder="Company email" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.country} onChange={(event) => updateField("country", event.target.value)} placeholder="Country" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.city} onChange={(event) => updateField("city", event.target.value)} placeholder="City" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.address} onChange={(event) => updateField("address", event.target.value)} placeholder="Address" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.website ?? ""} onChange={(event) => updateField("website", event.target.value)} placeholder="Website" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.hr_contact} onChange={(event) => updateField("hr_contact", event.target.value)} placeholder="HR contact" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.phone_number} onChange={(event) => updateField("phone_number", event.target.value)} placeholder="Phone number" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.industry} onChange={(event) => updateField("industry", event.target.value)} placeholder="Industry" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={profile.company_size} onChange={(event) => updateField("company_size", event.target.value)} placeholder="Company size" required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <textarea value={profile.company_description} onChange={(event) => updateField("company_description", event.target.value)} rows={4} placeholder="Company description" required className="md:col-span-2 rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <button type="submit" className="md:col-span-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">Save Company Profile</button>
        </form>
      </section>
    </main>
  );
}
