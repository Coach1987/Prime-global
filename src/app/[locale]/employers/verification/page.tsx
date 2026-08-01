"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { PrimeButton } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeInput, PrimeLabel } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

export default function CompanyVerificationPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [hasSession, setHasSession] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [status, setStatus] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  async function loadStatus() {
    const response = await fetch("/api/companies/verification", { credentials: "include" });
    const payload = await response.json();
    setStatus(payload?.data ?? []);
  }

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setHasSession(Boolean(payload?.success && payload?.data?.role === "employer")))
      .catch(() => setHasSession(false));
  }, []);

  useEffect(() => {
    if (!hasSession) return;

    loadStatus()
      .catch(() => undefined);
  }, [hasSession]);

  async function submit(form: HTMLFormElement | null, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!form) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(form);
    const response = await fetch("/api/companies/verification", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      setFieldErrors(payload?.details?.fieldErrors ?? {});
      setError(isArabic ? payload?.details?.messageAr ?? "تعذر إرسال طلب التحقق." : payload?.error?.message ?? "Unable to submit verification request.");
      setSubmitting(false);
      return;
    }

    form.reset();
    setMessage(isArabic ? "تم إرسال طلب التحقق وهو الآن قيد المراجعة." : "Verification submitted and now pending review.");
    await loadStatus();
    setSubmitting(false);
  }

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>Company Verification</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{isArabic ? "أرسل مستندات التحقق لبدء المراجعة." : "Submit verification documents to start Prime Global review."}</p>
        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}

        <form ref={formRef} className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={(event) => void submit(event.currentTarget, event)}>
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
              {fieldErrors[name] ? <p className="mt-1 text-xs text-red-300">{fieldErrors[name]}</p> : null}
            </PrimeLabel>
          ))}
          <PrimeInput name="documents" type="file" multiple className="md:col-span-2 file:mr-3 file:rounded-full file:border-0 file:bg-[#2E8FFF] file:px-3 file:py-1 file:text-white" />
          {fieldErrors.documents ? <p className="md:col-span-2 text-xs text-red-300">{fieldErrors.documents}</p> : null}
          <PrimeButton type="button" className="md:col-span-2" disabled={submitting} onClick={() => void submit(formRef.current)}>{submitting ? (isArabic ? "جارٍ الإرسال..." : "Submitting...") : "Submit Verification"}</PrimeButton>
        </form>

        <div className="mt-8 space-y-3">
          {status.length === 0 ? (
            <PrimeCard className="p-4">
              <p className="text-sm text-text-secondary">{isArabic ? "لم يتم إرسال طلب التحقق بعد." : "Verification has not been submitted."}</p>
            </PrimeCard>
          ) : (
            status.map((item) => (
              <PrimeCard key={String(item.id)} className="p-4">
                <p className="font-medium text-text-primary">{String(item.company_name ?? item.companyName ?? "Verification Request")}</p>
                <p className="mt-1 text-sm text-text-secondary">Status: {String(item.status ?? "pending")}</p>
              </PrimeCard>
            ))
          )}
        </div>
      </PrimeCard>
    </main>
  );
}
