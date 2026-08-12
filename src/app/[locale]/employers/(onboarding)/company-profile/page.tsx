"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  employerInput,
  employerPageShell,
  employerPrimaryButton,
  employerSectionCard,
  employerSurfaceCard,
} from "@/features/employers/ui/portal-theme";

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
  const t = useTranslations("employerCompanyProfile");
  const isArabic = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [verificationFieldErrors, setVerificationFieldErrors] = useState<Record<string, string>>({});
  const [verificationStatus, setVerificationStatus] = useState<Array<Record<string, unknown>>>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  function statusLabel(status: string) {
    if (status === "verified") return "Approved";
    if (status === "rejected") return "Rejected";
    if (status === "suspended") return "Suspended";
    return "Pending Review";
  }

  async function loadVerificationStatus() {
    const response = await fetch("/api/companies/verification", { credentials: "include" });
    if (!response.ok) {
      setVerificationStatus([]);
      return;
    }

    const payload = await response.json();
    setVerificationStatus(payload?.data ?? []);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/security/csrf"),
      fetch("/api/employers/profile", { credentials: "include" }),
      loadVerificationStatus(),
    ])
      .then(async ([csrfRes, profileRes]) => {
        const [csrfPayload, profilePayload] = await Promise.all([csrfRes.json(), profileRes.json()]);
        if (csrfRes.ok && csrfPayload?.success) setCsrfToken(csrfPayload?.data?.csrfToken ?? "");
        if (profileRes.ok && profilePayload?.success) {
          const needsOnboarding = Boolean(profilePayload?.meta?.requiresOnboarding && !profilePayload?.data);
          setRequiresOnboarding(needsOnboarding);
          setProfile(profilePayload.data ?? EMPTY_PROFILE);
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

  async function submitForVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setVerificationFieldErrors({});
    setVerificationMessage(null);
    setSubmittingVerification(true);

    const formData = new FormData();
    formData.set("companyName", profile.company_name);
    formData.set("commercialRegistrationNumber", profile.commercial_registration_number ?? "");
    formData.set("taxNumber", profile.tax_number ?? "");
    formData.set("country", profile.country);
    formData.set("address", profile.address);
    formData.set("officialEmail", profile.company_email);
    formData.set("website", profile.website ?? "");
    formData.set("phoneNumber", profile.phone_number);
    formData.set("responsiblePerson", profile.hr_contact);

    for (const file of documents) {
      formData.append("documents", file);
    }

    const response = await fetch("/api/companies/verification", {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrfToken },
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      setVerificationFieldErrors(payload?.details?.fieldErrors ?? {});
      setVerificationMessage(isArabic ? payload?.details?.messageAr ?? "تعذر إرسال طلب التحقق." : payload?.error?.message ?? "Unable to submit verification request.");
      setSubmittingVerification(false);
      return;
    }

    setDocuments([]);
    setVerificationMessage(isArabic ? "تم إرسال طلب التحقق وهو الآن قيد المراجعة." : "Verification submitted and now pending review.");
    await loadVerificationStatus();
    setSubmittingVerification(false);
  }

  if (loading) return <main className={employerPageShell}>{isArabic ? "جارٍ تحميل ملف الشركة..." : "Loading company profile..."}</main>;

  return (
    <main className={employerPageShell}>
      <section className={employerSurfaceCard}>
        <h1 className="font-heading text-3xl text-text-primary">{isArabic ? "ملف الشركة" : "Company Profile"}</h1>
        <p className="mt-3 text-sm text-text-secondary">
          {requiresOnboarding
            ? (isArabic ? "أكمل ملف الشركة للبدء." : "Complete your company profile to begin.")
            : `${isArabic ? "حالة التحقق" : "Verification status"}: ${statusLabel(profile?.verification_status ?? "pending")}`}
        </p>
        {!requiresOnboarding ? <p className="mt-3 text-sm leading-6 text-text-secondary">{t("registrationDataNotice")}</p> : null}
        {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input value={profile?.company_name ?? ""} onChange={(event) => updateField("company_name", event.target.value)} placeholder={isArabic ? "اسم الشركة" : "Company name"} required className={employerInput} />
          <input value={profile?.company_email ?? ""} onChange={(event) => updateField("company_email", event.target.value)} placeholder={isArabic ? "البريد الرسمي للشركة" : "Official company email"} required className={employerInput} />
          <input value={profile?.commercial_registration_number ?? ""} onChange={(event) => updateField("commercial_registration_number", event.target.value)} placeholder={isArabic ? "رقم السجل التجاري" : "Commercial registration number"} required className={employerInput} />
          <input value={profile?.tax_number ?? ""} onChange={(event) => updateField("tax_number", event.target.value)} placeholder={isArabic ? "الرقم الجبائي" : "Tax number"} required className={employerInput} />
          <input value={profile?.country ?? ""} onChange={(event) => updateField("country", event.target.value)} placeholder={isArabic ? "الدولة" : "Country"} required className={employerInput} />
          <input value={profile?.city ?? ""} onChange={(event) => updateField("city", event.target.value)} placeholder={isArabic ? "المدينة" : "City"} required className={employerInput} />
          <input value={profile?.address ?? ""} onChange={(event) => updateField("address", event.target.value)} placeholder={isArabic ? "العنوان" : "Address"} required className={employerInput} />
          <input value={profile?.website ?? ""} onChange={(event) => updateField("website", event.target.value)} placeholder={isArabic ? "الموقع الإلكتروني" : "Website"} className={employerInput} />
          <input value={profile?.hr_contact ?? ""} onChange={(event) => updateField("hr_contact", event.target.value)} placeholder={isArabic ? "الشخص المسؤول" : "Responsible person"} required className={employerInput} />
          <input value={profile?.phone_number ?? ""} onChange={(event) => updateField("phone_number", event.target.value)} placeholder={isArabic ? "رقم الهاتف" : "Phone"} required className={employerInput} />
          <input value={profile?.industry ?? ""} onChange={(event) => updateField("industry", event.target.value)} placeholder={isArabic ? "القطاع" : "Industry"} required className={employerInput} />
          <input value={profile?.company_size ?? ""} onChange={(event) => updateField("company_size", event.target.value)} placeholder={isArabic ? "حجم الشركة" : "Company size"} required className={employerInput} />
          <textarea value={profile?.company_description ?? ""} onChange={(event) => updateField("company_description", event.target.value)} rows={4} placeholder={isArabic ? "وصف الشركة" : "Company description"} required className={`md:col-span-2 ${employerInput}`} />
          {Object.keys(fieldErrors).length > 0 ? (
            <div className="md:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
              {Object.entries(fieldErrors).map(([fieldName, fieldMessage]) => (
                <p key={fieldName}>{fieldName}: {fieldMessage}</p>
              ))}
            </div>
          ) : null}
          <button type="submit" className={`md:col-span-2 ${employerPrimaryButton}`}>{requiresOnboarding ? (isArabic ? "إنشاء ملف الشركة" : "Create Company Profile") : (isArabic ? "حفظ ملف الشركة" : "Save Company Profile")}</button>
        </form>

        <section className={`mt-10 ${employerSectionCard}`}>
          <h2 className="font-heading text-2xl text-text-primary">{isArabic ? "التحقق من الشركة" : "Company Verification"}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {isArabic ? "أضف مستندات التسجيل ثم أرسل الملف للمراجعة." : "Upload registration documents and submit your profile for review."}
          </p>

          <form onSubmit={submitForVerification} className="mt-5 space-y-4">
            <label className="block text-sm text-text-secondary">
              {isArabic ? "مستندات التسجيل" : "Registration documents"}
              <input
                type="file"
                multiple
                onChange={(event) => setDocuments(Array.from(event.target.files ?? []))}
                className={`mt-2 ${employerInput}`}
              />
            </label>

            {verificationFieldErrors.documents ? <p className="text-sm text-red-300">{verificationFieldErrors.documents}</p> : null}
            {verificationMessage ? <p className="text-sm text-emerald-200">{verificationMessage}</p> : null}

            <button
              type="submit"
              disabled={submittingVerification}
              className="inline-flex items-center justify-center rounded-xl border border-gold/30 px-5 py-3 text-sm font-semibold text-gold transition-colors duration-200 hover:bg-gold/10 disabled:opacity-60"
            >
              {submittingVerification
                ? (isArabic ? "جارٍ الإرسال..." : "Submitting...")
                : (isArabic ? "إرسال للتحقق" : "Submit for Verification")}
            </button>
          </form>

          <div className="mt-6 space-y-2">
            {verificationStatus.length === 0 ? (
              <p className="text-sm text-text-secondary">{isArabic ? "لم يتم إرسال طلب تحقق بعد." : "Verification has not been submitted."}</p>
            ) : (
              verificationStatus.map((item) => (
                <div key={String(item.id)} className="rounded-xl border border-gold/15 bg-bg-primary/70 p-3 text-sm text-text-secondary">
                  <p>{String(item.company_name ?? profile?.company_name ?? "Company")}</p>
                  <p className="mt-1">{isArabic ? "الحالة" : "Status"}: {String(item.status ?? "pending")}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
