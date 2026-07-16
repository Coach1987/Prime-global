"use client";

import { FormEvent, useEffect, useState } from "react";
import { PrimeButton } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeInput, PrimeLabel } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

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
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>Company Verification</PrimePageTitle>
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
            <PrimeLabel key={name}>
              <span className="mb-2 block">{label}</span>
              <PrimeInput name={name} />
            </PrimeLabel>
          ))}
          <PrimeInput name="documents" type="file" multiple className="md:col-span-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#2E8FFF] file:px-3 file:py-1 file:text-white" />
          <PrimeButton type="submit" className="md:col-span-2">Submit Verification</PrimeButton>
        </form>

        <div className="mt-8 space-y-3">
          {status.map((item) => (
            <PrimeCard key={String(item.id)} className="p-4">
              <p className="font-medium text-text-primary">{String(item.company_name ?? item.companyName ?? "Verification Request")}</p>
              <p className="mt-1 text-sm text-text-secondary">Status: {String(item.status ?? "pending")}</p>
            </PrimeCard>
          ))}
        </div>
      </PrimeCard>
    </main>
  );
}
