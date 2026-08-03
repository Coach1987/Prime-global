"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";

type EmployerListItem = {
  id: string;
  companyName: string;
  commercialRegistrationNumber: string;
  companyEmail: string;
  country: string;
  city: string;
  verificationStatus: string;
  accountStatus: "pending_review" | "approved" | "rejected" | "suspended" | null;
  verificationNotes: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type EmployerDocument = {
  id: string;
  documentType: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  signedUrl: string | null;
};

type EmployerTimelineEntry = {
  id: string;
  eventType: "approved" | "rejected" | "suspended" | "reactivated" | "other";
  action: string;
  actorAuthUserId: string | null;
  actorRole: string | null;
  reason: string | null;
  timestamp: string;
};

type EmployerJob = {
  id: string;
  title: string;
  status: string;
  publishDate: string | null;
  createdAt: string;
};

type EmployerAdvertisement = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

type EmployerDetail = EmployerListItem & {
  registration: {
    authUserId: string;
    accountEmail: string | null;
    registeredAt: string;
  };
  profile: {
    taxNumber: string;
    address: string;
    website: string | null;
    hrContact: string;
    phoneNumber: string;
    industry: string;
    companySize: string;
    companyDescription: string;
    logoStoragePath: string | null;
    logoSignedUrl: string | null;
  };
  documents: EmployerDocument[];
  registrationDocuments: EmployerDocument[];
  taxDocuments: EmployerDocument[];
  deletionPolicy: {
    allowed: boolean;
    reasons: string[];
    jobsCount: number;
    documentsCount: number;
  };
  jobs: EmployerJob[];
  advertisements: EmployerAdvertisement[];
  verificationHistory: EmployerTimelineEntry[];
  activityTimeline: EmployerTimelineEntry[];
  lastLoginAt: string | null;
  isSystemCompany: boolean;
};

const FILTERS = ["all", "pending_review", "approved", "rejected", "suspended"] as const;

type FilterValue = (typeof FILTERS)[number];

function statusClasses(status: EmployerListItem["accountStatus"]) {
  if (status === "approved") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "rejected") return "border-red-400/30 bg-red-500/10 text-red-200";
  if (status === "suspended") return "border-amber-400/30 bg-amber-500/10 text-amber-200";
  return "border-gold/30 bg-gold/10 text-gold";
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function localizeOperationalStatus(status: string, locale: string) {
  const normalized = status.trim().toLowerCase();
  if (locale !== "ar") return status;

  if (normalized === "approved" || normalized === "verified") return "معتمد";
  if (normalized === "pending_review" || normalized === "pending") return "قيد المراجعة";
  if (normalized === "published") return "منشور";
  if (normalized === "active") return "نشط";
  if (normalized === "inactive") return "غير نشط";
  if (normalized === "archived") return "مؤرشف";
  if (normalized === "rejected") return "مرفوض";
  if (normalized === "suspended") return "معلّق";
  if (normalized === "reactivated") return "مُعاد التفعيل";
  if (normalized === "paused") return "متوقف";
  if (normalized === "expired") return "منتهي";
  if (normalized === "draft") return "مسودة";
  return status;
}

function localizeActorRole(role: string | null, locale: string) {
  if (!role) return "-";
  if (locale !== "ar") return role;

  if (role === "prime_global_recruiter") return "مجند";
  if (role === "prime_global_admin") return "مالك";
  if (role === "admin") return "مسؤول";
  if (role === "super_admin") return "مسؤول أعلى";
  if (role === "employer") return "صاحب عمل";
  if (role === "candidate") return "مرشح";

  return role;
}

function localizeReason(reason: string, locale: string) {
  if (locale !== "ar") return reason;
  if (reason === "Only rejected or suspended companies can be deleted.") return "يُسمح بالحذف فقط للشركات المرفوضة أو المعلّقة.";
  if (reason === "Deletion is blocked while the company still owns job records.") return "الحذف محظور طالما أن الشركة لا تزال تملك سجلات وظائف.";
  if (reason === "Delete is blocked while the company still owns job records.") return "الحذف محظور طالما أن الشركة لا تزال تملك سجلات وظائف.";
  if (reason === "A reason is required for this action.") return "سبب هذا الإجراء مطلوب.";
  if (reason === "Invalid employer id") return "معرّف الشركة غير صالح";
  if (reason === "Employer not found") return "لم يتم العثور على الشركة";
  if (reason === "Invalid role") return "الدور غير صالح";
  if (reason === "Employer deletion is blocked by policy.") return "الحذف محظور بسبب سياسة الشركة.";
  return reason;
}

function localizeErrorMessage(message: string | null | undefined, locale: string, t: ReturnType<typeof useTranslations>) {
  if (!message) return t("errors.actionFailed");
  if (locale !== "ar") return message;

  const localized = localizeReason(message, locale);
  if (localized !== message) return localized;

  if (message === t("errors.loadEmployers") || message === t("errors.loadDetail") || message === t("errors.actionFailed") || message === t("errors.copyFailed")) {
    return message;
  }

  if (message.toLowerCase().includes("invalid credentials") || message.toLowerCase().includes("role mismatch")) {
    return t("errors.invalidRole");
  }

  // Keep Arabic UI free of raw backend English strings.
  return t("errors.actionFailed");
}

function isLikelyTestCompany(item: EmployerListItem) {
  const source = `${item.companyName} ${item.companyEmail} ${item.commercialRegistrationNumber}`.toLowerCase();
  return source.includes("test") || source.includes("demo") || source.includes("sample") || source.includes("dummy");
}

export function AdminCompanyManagementCenter({ locale }: { locale: string }) {
  const t = useTranslations("ownerPortal.companyManagement");
  const isArabic = locale === "ar";
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [items, setItems] = useState<EmployerListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmployerDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  const visibleItems = useMemo(() => items.filter((item) => !isLikelyTestCompany(item)), [items]);

  const loadEmployers = useCallback(async (nextQuery: string, nextFilter: FilterValue) => {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextFilter) params.set("status", nextFilter);

    const response = await fetch(`/api/admin/employers?${params.toString()}`, {
      credentials: "include",
    });
    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error(localizeErrorMessage(payload?.error?.message ?? t("errors.loadEmployers"), locale, t));
    }

    const nextItems = (payload.data ?? []) as EmployerListItem[];
    setItems(nextItems);

    if (nextItems.length === 0) {
      setSelectedId(null);
      setDetail(null);
      return;
    }

    if (!selectedId || !nextItems.some((item) => item.id === selectedId)) {
      setSelectedId(nextItems[0].id);
    }
  }, [locale, selectedId, t]);

  const loadEmployerDetail = useCallback(async (employerId: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/admin/employers/${employerId}`, {
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(localizeErrorMessage(payload?.error?.message ?? t("errors.loadDetail"), locale, t));
      }

      setDetail((payload.data ?? null) as EmployerDetail | null);
      setNote(String(payload?.data?.verificationNotes ?? ""));
    } finally {
      setDetailsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);
        const csrfResponse = await fetch("/api/security/csrf", { credentials: "include" });
        const csrfPayload = await csrfResponse.json();
        setCsrfToken(String(csrfPayload?.data?.csrfToken ?? ""));
        await loadEmployers(query, filter);
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : t("errors.loadEmployers"));
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [filter, loadEmployers, locale, query, t]);

  useEffect(() => {
    if (!selectedId) return;
    void loadEmployerDetail(selectedId).catch((detailError) => {
      setError(detailError instanceof Error ? detailError.message : t("errors.loadDetail"));
    });
  }, [loadEmployerDetail, selectedId, t]);

  async function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      await loadEmployers(query, filter);
    } catch (searchError) {
      setError(searchError instanceof Error ? localizeErrorMessage(searchError.message, locale, t) : t("errors.loadEmployers"));
    }
  }

  async function runAction(action: "approve" | "reject" | "suspend" | "reactivate" | "delete", reasonOverride?: string) {
    if (!selectedId) {
      return;
    }

    const actionReason = (reasonOverride ?? note).trim();
    if ((action === "reject" || action === "suspend" || action === "delete") && actionReason.length < 3) {
      setError(t("errors.reasonRequired"));
      return;
    }

    try {
      setActing(true);
      setError(null);
      setMessage(null);

      const response = await fetch(`/api/admin/employers/${selectedId}/actions`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ action, reason: actionReason || undefined }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        if (payload?.error?.code === "DELETE_BLOCKED" && Array.isArray(payload?.data?.reasons)) {
          throw new Error(payload.data.reasons.map((reason: string) => localizeReason(reason, locale)).join(" "));
        }
        throw new Error(localizeErrorMessage(payload?.error?.message ?? t("errors.actionFailed"), locale, t));
      }

      setMessage(t("messages.actionCompleted"));

      if (payload?.data?.deleted) {
        setSelectedId(null);
        setDetail(null);
      } else {
        setDetail((payload.data ?? null) as EmployerDetail | null);
      }

      await loadEmployers(query, filter);
      if (selectedId && action !== "delete") {
        await loadEmployerDetail(selectedId);
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? localizeErrorMessage(actionError.message, locale, t) : t("errors.actionFailed"));
    } finally {
      setActing(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(t("messages.copied"));
    } catch {
      setError(t("errors.copyFailed"));
    }
  }

  const canDelete = Boolean(detail?.deletionPolicy.allowed);
  const companyNameMatches = deleteName.trim() === (detail?.companyName ?? "");

  return (
    <main className="mx-auto w-full max-w-[1340px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <PrimePageTitle>{t("title")}</PrimePageTitle>
            <p className="mt-3 text-sm text-text-secondary">{t("subtitle")}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={`/${locale}/admin/advertisements`} className={primeButtonClasses("secondary")}>
              {t("openAdvertisements")}
            </a>
            <a href={`/${locale}/admin/recruitment`} className={primeButtonClasses("secondary")}>
              {t("openRecruitment")}
            </a>
          </div>
        </div>

        <form className="mt-8 flex flex-wrap gap-3" onSubmit={onSearchSubmit}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-w-[280px] flex-1 rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as FilterValue)}
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          >
            {FILTERS.map((entry) => (
              <option key={entry} value={entry}>
                {t(`filters.${entry}`)}
              </option>
            ))}
          </select>

          <button type="submit" className={primeButtonClasses("primary")}>
            {t("search")}
          </button>
        </form>

        {loading ? <p className="mt-6 text-sm text-text-secondary">{t("loading")}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`block w-full rounded-2xl border p-5 text-left transition ${
                  selectedId === item.id
                    ? "border-gold/40 bg-bg-primary"
                    : "border-gold/15 bg-bg-primary/70 hover:border-gold/30"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl text-text-primary">{item.companyName}</h2>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusClasses(item.accountStatus)}`}>
                    {t(`status.${item.accountStatus ?? "pending_review"}`)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{item.commercialRegistrationNumber}</p>
                <p className="mt-2 text-sm text-text-tertiary">
                  <span dir="ltr" className="[unicode-bidi:isolate]">{item.companyEmail}</span>
                  <span>{" • "}</span>
                  <span>{item.country}</span>
                </p>
              </button>
            ))}

            {!loading && visibleItems.length === 0 ? <p className="text-sm text-text-secondary">{t("empty")}</p> : null}
          </div>

          <PrimeCard className="p-6">
            {detailsLoading ? <p className="text-sm text-text-secondary">{t("loadingDetail")}</p> : null}
            {!detailsLoading && !detail ? <p className="text-sm text-text-secondary">{t("selectCompany")}</p> : null}

            {detail ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-3xl text-text-primary">{detail.companyName}</h2>
                    <p className="mt-2 text-sm text-text-secondary">{t("statusLabel")}: {t(`status.${detail.accountStatus ?? "pending_review"}`)}</p>
                    {detail.isSystemCompany ? (
                      <span className="mt-3 inline-flex rounded-full border border-blue-200/40 px-3 py-1 text-xs uppercase tracking-[0.14em] text-blue-100">
                        {t("officialCompany")}
                      </span>
                    ) : null}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusClasses(detail.accountStatus)}`}>
                      {localizeOperationalStatus(detail.verificationStatus, locale)}
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-start gap-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4">
                  {detail.profile.logoSignedUrl ? (
                    <img src={detail.profile.logoSignedUrl} alt={detail.companyName} className="h-20 w-20 rounded-xl object-cover ring-1 ring-gold/20" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-gold/20 bg-bg-secondary text-sm text-text-tertiary">
                      {t("sections.logo")}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-heading text-2xl text-text-primary">{detail.companyName}</h3>
                    <p className="mt-2 text-sm text-text-secondary">
                      <span dir="ltr" className="[unicode-bidi:isolate] break-all">{detail.companyEmail}</span>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <div className="rounded-full border border-gold/15 bg-bg-secondary px-3 py-1 text-text-secondary">{t("fields.jobsCount")}: {detail.jobs.length}</div>
                      <div className="rounded-full border border-gold/15 bg-bg-secondary px-3 py-1 text-text-secondary">{t("fields.documentsCount")}: {detail.documents.length}</div>
                      <div className="rounded-full border border-gold/15 bg-bg-secondary px-3 py-1 text-text-secondary">{t("fields.advertisementsCount")}: {detail.advertisements.length}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                    <h3 className="font-semibold text-text-primary">{t("sections.registrationInfo")}</h3>
                    <p className="mt-3">{t("fields.accountEmail")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{detail.registration.accountEmail ?? "-"}</span></p>
                    <p className="mt-2">{t("fields.companyEmail")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{detail.companyEmail}</span></p>
                    <p className="mt-2">{t("fields.commercialRegistration")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{detail.commercialRegistrationNumber}</span></p>
                    <p className="mt-2">{t("fields.taxNumber")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{detail.profile.taxNumber}</span></p>
                    <p className="mt-2">{t("fields.registered")}: <span dir={isArabic ? "rtl" : "ltr"} className="[unicode-bidi:isolate]">{formatDateTime(detail.registration.registeredAt, locale)}</span></p>
                    <p className="mt-2">{t("fields.verifiedAt")}: <span dir={isArabic ? "rtl" : "ltr"} className="[unicode-bidi:isolate]">{formatDateTime(detail.verifiedAt, locale)}</span></p>
                    <p className="mt-2">{t("fields.lastLogin")}: <span dir={isArabic ? "rtl" : "ltr"} className="[unicode-bidi:isolate]">{formatDateTime(detail.lastLoginAt, locale)}</span></p>
                  </section>

                  <section className="rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                    <h3 className="font-semibold text-text-primary">{t("sections.companyProfile")}</h3>
                    <p className="mt-3">{t("fields.country")}: {detail.country}</p>
                    <p className="mt-2">{t("fields.city")}: {detail.city}</p>
                    <p className="mt-2">{t("fields.address")}: {detail.profile.address}</p>
                    <p className="mt-2">
                      {t("fields.website")}: {detail.profile.website ? (
                        <a href={detail.profile.website} target="_blank" rel="noreferrer" dir="ltr" className="text-gold hover:underline [unicode-bidi:isolate] break-all">{detail.profile.website}</a>
                      ) : "-"}
                    </p>
                    <p className="mt-2">{t("fields.hrContact")}: {detail.profile.hrContact}</p>
                    <p className="mt-2">
                      {t("fields.phone")}: <span dir="ltr" className="[unicode-bidi:isolate]">{detail.profile.phoneNumber}</span>
                      <button type="button" onClick={() => void copyText(detail.profile.phoneNumber)} className="ms-2 text-xs text-gold hover:underline">{t("copy")}</button>
                    </p>
                    <p className="mt-2">
                      {t("fields.companyEmail")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{detail.companyEmail}</span>
                      <button type="button" onClick={() => void copyText(detail.companyEmail)} className="ms-2 text-xs text-gold hover:underline">{t("copy")}</button>
                    </p>
                    <p className="mt-2">{t("fields.industry")}: {detail.profile.industry}</p>
                    <p className="mt-2">{t("fields.companySize")}: {detail.profile.companySize}</p>
                  </section>
                </div>

                <section className="mt-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                  <h3 className="font-semibold text-text-primary">{t("sections.registrationDocuments")}</h3>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {detail.registrationDocuments.map((document) => (
                      <div key={document.id} className="rounded-xl border border-gold/10 bg-bg-secondary/60 px-4 py-3">
                        <p className="text-text-primary">{document.originalFilename}</p>
                        <p className="mt-1 text-xs text-text-tertiary"><span dir="ltr" className="[unicode-bidi:isolate]">{document.mimeType}</span> • <span dir="ltr" className="[unicode-bidi:isolate]">{Math.round(document.sizeBytes / 1024)} KB</span></p>
                        <p className="mt-1 text-xs text-text-tertiary">{formatDateTime(document.uploadedAt, locale)}</p>
                        {document.signedUrl ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a href={document.signedUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-gold/20 px-3 py-1.5 text-sm font-semibold text-gold hover:bg-gold/10">
                              {t("openDocument")}
                            </a>
                            <a href={document.signedUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-gold/20 px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-gold/10">
                              {t("previewDocument")}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {detail.registrationDocuments.length === 0 ? <p>{t("emptyRegistrationDocuments")}</p> : null}
                  </div>
                </section>

                <section className="mt-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                  <h3 className="font-semibold text-text-primary">{t("sections.taxDocuments")}</h3>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {detail.taxDocuments.map((document) => (
                      <div key={document.id} className="rounded-xl border border-gold/10 bg-bg-secondary/60 px-4 py-3">
                        <p className="text-text-primary">{document.originalFilename}</p>
                        <p className="mt-1 text-xs text-text-tertiary"><span dir="ltr" className="[unicode-bidi:isolate]">{document.mimeType}</span> • <span dir="ltr" className="[unicode-bidi:isolate]">{Math.round(document.sizeBytes / 1024)} KB</span></p>
                        <p className="mt-1 text-xs text-text-tertiary">{formatDateTime(document.uploadedAt, locale)}</p>
                        {document.signedUrl ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a href={document.signedUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-gold/20 px-3 py-1.5 text-sm font-semibold text-gold hover:bg-gold/10">
                              {t("openDocument")}
                            </a>
                            <a href={document.signedUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-gold/20 px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-gold/10">
                              {t("previewDocument")}
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {detail.taxDocuments.length === 0 ? <p>{t("emptyTaxDocuments")}</p> : null}
                  </div>
                </section>

                <section className="mt-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                  <h3 className="font-semibold text-text-primary">{t("sections.verificationHistory")}</h3>
                  <div className="mt-4 space-y-3">
                    {detail.verificationHistory.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-gold/10 px-4 py-3">
                        <p className="text-text-primary">{t(`timeline.${entry.eventType}`)}</p>
                        <p className="mt-1 text-xs text-text-tertiary">{formatDateTime(entry.timestamp, locale)}</p>
                        <p className="mt-1 text-xs text-text-tertiary">{t("fields.actor")}: <span dir="ltr" className="[unicode-bidi:isolate]">{localizeActorRole(entry.actorRole, locale)}</span></p>
                        {entry.reason ? <p className="mt-1 text-xs text-text-tertiary">{t("fields.reason")}: {localizeReason(entry.reason, locale)}</p> : null}
                      </div>
                    ))}
                    {detail.verificationHistory.length === 0 ? <p>{t("emptyHistory")}</p> : null}
                  </div>
                </section>

                <section className="mt-4 grid gap-4 lg:grid-cols-2">
                  <PrimeCard className="p-4 text-sm text-text-secondary">
                    <h3 className="font-semibold text-text-primary">{t("sections.jobs")}</h3>
                    <div className="mt-3 space-y-2">
                      {detail.jobs.slice(0, 8).map((job) => (
                        <div key={job.id} className="rounded-lg border border-gold/10 px-3 py-2">
                          <p className="text-text-primary">{job.title}</p>
                          <p className="mt-1 text-xs text-text-tertiary">{localizeOperationalStatus(job.status, locale)} • <span dir={isArabic ? "rtl" : "ltr"} className="[unicode-bidi:isolate]">{formatDateTime(job.publishDate ?? job.createdAt, locale)}</span></p>
                        </div>
                      ))}
                      {detail.jobs.length === 0 ? <p>{t("emptyJobs")}</p> : null}
                    </div>
                  </PrimeCard>

                  <PrimeCard className="p-4 text-sm text-text-secondary">
                    <h3 className="font-semibold text-text-primary">{t("sections.advertisements")}</h3>
                    <div className="mt-3 space-y-2">
                      {detail.advertisements.slice(0, 8).map((ad) => (
                        <div key={ad.id} className="rounded-lg border border-gold/10 px-3 py-2">
                          <p className="text-text-primary">{ad.title}</p>
                          <p className="mt-1 text-xs text-text-tertiary">{localizeOperationalStatus(ad.status, locale)} • <span dir={isArabic ? "rtl" : "ltr"} className="[unicode-bidi:isolate]">{formatDateTime(ad.updatedAt, locale)}</span></p>
                        </div>
                      ))}
                      {detail.advertisements.length === 0 ? <p>{t("emptyAdvertisements")}</p> : null}
                    </div>
                  </PrimeCard>
                </section>

                <section className="mt-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                  <h3 className="font-semibold text-text-primary">{t("sections.reviewNotes")}</h3>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    placeholder={t("notesPlaceholder")}
                    className="mt-3 w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
                  />
                  {detail.verificationNotes ? <p className="mt-3">{t("currentNote")}: {detail.verificationNotes}</p> : null}
                </section>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" disabled={acting} onClick={() => void runAction("approve")} className={primeButtonClasses("primary")}>
                    {t("actions.approve")}
                  </button>
                  <button type="button" disabled={acting} onClick={() => void runAction("reject")} className={primeButtonClasses("secondary")}>
                    {t("actions.reject")}
                  </button>
                  <button type="button" disabled={acting} onClick={() => void runAction("suspend")} className={primeButtonClasses("secondary")}>
                    {t("actions.suspend")}
                  </button>
                  <button type="button" disabled={acting} onClick={() => void runAction("reactivate")} className={primeButtonClasses("secondary")}>
                    {t("actions.reactivate")}
                  </button>
                  <button
                    type="button"
                    disabled={acting || !canDelete}
                    onClick={() => {
                      setDeleteName("");
                      setDeleteReason("");
                      setShowDeleteDialog(true);
                    }}
                    className={primeButtonClasses("secondary")}
                  >
                    {t("actions.delete")}
                  </button>
                </div>
              </div>
            ) : null}
          </PrimeCard>
        </div>
      </PrimeCard>

      {showDeleteDialog && detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteDialog(false)}>
          <div className="w-full max-w-xl rounded-2xl border border-gold/20 bg-bg-primary p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="font-heading text-2xl text-text-primary">{t("deleteDialog.title")}</h3>
            <p className="mt-2 text-sm text-text-secondary">{t("deleteDialog.subtitle", { company: detail.companyName })}</p>

            <label className="mt-4 block text-sm text-text-secondary">
              {t("deleteDialog.typeName")}
              <input
                value={deleteName}
                onChange={(event) => setDeleteName(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gold/20 bg-bg-secondary px-3 py-2 text-text-primary"
              />
            </label>

            <label className="mt-4 block text-sm text-text-secondary">
              {t("deleteDialog.reason")}
              <textarea
                rows={4}
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gold/20 bg-bg-secondary px-3 py-2 text-text-primary"
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className={primeButtonClasses("primary")}
                disabled={!companyNameMatches || deleteReason.trim().length < 3 || acting}
                onClick={() => {
                  void runAction("delete", deleteReason).then(() => {
                    setShowDeleteDialog(false);
                  });
                }}
              >
                {t("deleteDialog.confirm")}
              </button>
              <button type="button" className={primeButtonClasses("secondary")} onClick={() => setShowDeleteDialog(false)}>
                {t("deleteDialog.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
