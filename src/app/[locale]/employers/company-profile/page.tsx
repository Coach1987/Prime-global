"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";

type EmployerProfile = {
  company_name: string;
  commercial_registration_number?: string;
  company_email: string;
  tax_number?: string;
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

const EMPTY_PROFILE: EmployerProfile = {
  company_name: "",
  commercial_registration_number: "",
  company_email: "",
  tax_number: "",
  country: "",
  city: "",
  address: "",
  website: "",
  hr_contact: "",
  phone_number: "",
  industry: "",
  company_size: "11-50",
  company_description: "",
  verification_status: "pending",
};

export default function EmployerCompanyProfilePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function statusLabel(status: string) {
    if (status === "verified") return "Approved";
    if (status === "rejected") return "Rejected";
    if (status === "suspended") return "Suspended";
    return "Pending Review";
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/security/csrf"),
      fetch("/api/employers/profile", { credentials: "include" }),
    ])
      .then(async ([csrfRes, profileRes]) => {
        const [csrfPayload, profilePayload] = await Promise.all([csrfRes.json(), profileRes.json()]);
        if (csrfRes.ok && csrfPayload?.success) setCsrfToken(csrfPayload?.data?.csrfToken ?? "");
        if (profileRes.ok && profilePayload?.success) {
          const needsOnboarding = Boolean(profilePayload?.meta?.requiresOnboarding && !profilePayload?.data);
          setRequiresOnboarding(needsOnboarding);
          setProfile(profilePayload.data ?? (needsOnboarding ? EMPTY_PROFILE : null));
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

    setFieldErrors({});

    const response = await fetch("/api/employers/profile", {
      method: requiresOnboarding ? "POST" : "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        companyName: profile.company_name,
        commercialRegistrationNumber: profile.commercial_registration_number,
        taxNumber: profile.tax_number,
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
      setFieldErrors(payload?.details?.fieldErrors ?? {});
      setMessage(payload?.error?.message ?? "Unable to update company profile");
      return;
    }

    setProfile(payload.data ?? profile);
    setRequiresOnboarding(false);
    setMessage(requiresOnboarding ? (isArabic ? "تم إنشاء ملف الشركة بنجاح." : "Company profile created.") : (isArabic ? "تم تحديث ملف الشركة." : "Company profile updated."));
  }

  if (loading) return <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">{isArabic ? "جارٍ تحميل ملف الشركة..." : "Loading company profile..."}</main>;

  if (!profile) {
    return <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">{isArabic ? "تعذر تحميل ملف الشركة." : "Company profile unavailable."}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">Company Profile</h1>
        <p className="mt-3 text-sm text-text-secondary">
          {requiresOnboarding
            ? (isArabic ? "أكمل تسجيل الشركة للبدء من حساب نظيف ومعزول." : "Complete company registration to start from a clean, isolated employer account.")
            : `Verification status: ${statusLabel(profile.verification_status)}`}
        </p>
        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          {requiresOnboarding ? (
            <>
              <input value={profile.commercial_registration_number ?? ""} onChange={(event) => updateField("commercial_registration_number", event.target.value)} placeholder={isArabic ? "رقم السجل التجاري" : "Commercial registration number"} required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
              <input value={profile.tax_number ?? ""} onChange={(event) => updateField("tax_number", event.target.value)} placeholder={isArabic ? "الرقم الجبائي" : "Tax number"} required className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
            </>
          ) : null}
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
          {Object.keys(fieldErrors).length > 0 ? (
            <div className="md:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
              {Object.entries(fieldErrors).map(([fieldName, fieldMessage]) => (
                <p key={fieldName}>{fieldName}: {fieldMessage}</p>
              ))}
            </div>
          ) : null}
          <button type="submit" className="md:col-span-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">{requiresOnboarding ? (isArabic ? "إنشاء ملف الشركة" : "Create Company Profile") : (isArabic ? "حفظ ملف الشركة" : "Save Company Profile")}</button>
        </form>
      </section>
    </main>
  );
}
