"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  };
  documents: Array<{
    id: string;
    documentType: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
    signedUrl: string | null;
  }>;
  deletionPolicy: {
    allowed: boolean;
    reasons: string[];
    jobsCount: number;
    documentsCount: number;
  };
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
] as const;

function statusLabel(status: EmployerListItem["accountStatus"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "suspended") return "Suspended";
  return "Pending Review";
}

function statusClasses(status: EmployerListItem["accountStatus"]) {
  if (status === "approved") return "border-emerald-400/30 text-emerald-200";
  if (status === "rejected") return "border-red-400/30 text-red-200";
  if (status === "suspended") return "border-amber-400/30 text-amber-200";
  return "border-gold/30 text-gold";
}

export function AdminCompanyManagementCenter({ locale }: { locale: string }) {
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [items, setItems] = useState<EmployerListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmployerDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const hasSelection = useMemo(() => Boolean(selectedId), [selectedId]);

  const loadEmployers = useCallback(async (nextQuery: string, nextFilter: string) => {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextFilter) params.set("status", nextFilter);

    const response = await fetch(`/api/admin/employers?${params.toString()}`, {
      credentials: "include",
    });
    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? "Failed to load employers");
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
  }, [selectedId]);

  const loadEmployerDetail = useCallback(async (employerId: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/admin/employers/${employerId}`, {
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Failed to load employer details");
      }

      setDetail((payload.data ?? null) as EmployerDetail | null);
      setNote(String(payload?.data?.verificationNotes ?? ""));
    } finally {
      setDetailsLoading(false);
    }
  }, []);

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
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to load employers");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [filter, loadEmployers, query]);

  useEffect(() => {
    if (!selectedId) return;
    void loadEmployerDetail(selectedId).catch((detailError) => {
      setError(detailError instanceof Error ? detailError.message : "Failed to load employer details");
    });
  }, [loadEmployerDetail, selectedId]);

  async function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      await loadEmployers(query, filter);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Failed to load employers");
    }
  }

  async function runAction(action: "approve" | "reject" | "suspend" | "reactivate" | "delete") {
    if (!selectedId) {
      return;
    }

    if (action === "delete" && !window.confirm("Delete this company account if policy allows it?")) {
      return;
    }

    if ((action === "reject" || action === "suspend") && note.trim().length < 3) {
      setError("A reason of at least 3 characters is required for this action.");
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
        body: JSON.stringify({ action, reason: note.trim() || undefined }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        if (payload?.error?.code === "DELETE_BLOCKED" && Array.isArray(payload?.data?.reasons)) {
          throw new Error(payload.data.reasons.join(" "));
        }
        throw new Error(payload?.error?.message ?? "Unable to complete company action");
      }

      setMessage(`Company action completed: ${action}.`);

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
      setError(actionError instanceof Error ? actionError.message : "Unable to complete company action");
    } finally {
      setActing(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1340px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <PrimePageTitle>Company Management</PrimePageTitle>
            <p className="mt-3 text-sm text-text-secondary">
              Review employer registrations, inspect documents, and manage company lifecycle decisions from the admin portal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={`/${locale}/admin/advertisements`} className={primeButtonClasses("secondary")}>
              Open Advertisements Center
            </a>
            <a href={`/${locale}/admin/recruitment`} className={primeButtonClasses("secondary")}>
              Open Recruitment Center
            </a>
          </div>
        </div>

        <form className="mt-8 flex flex-wrap gap-3" onSubmit={onSearchSubmit}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search company, registration number, email, or country"
            className="min-w-[280px] flex-1 rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as (typeof FILTERS)[number]["value"])}
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          >
            {FILTERS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>

          <button type="submit" className={primeButtonClasses("primary")}>
            Search
          </button>
        </form>

        {loading ? <p className="mt-6 text-sm text-text-secondary">Loading companies...</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4">
            {items.map((item) => (
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
                    {statusLabel(item.accountStatus)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">{item.commercialRegistrationNumber}</p>
                <p className="mt-2 text-sm text-text-tertiary">{item.companyEmail} • {item.country}</p>
              </button>
            ))}

            {!loading && items.length === 0 ? <p className="text-sm text-text-secondary">No companies found.</p> : null}
          </div>

          <PrimeCard className="p-6">
            {detailsLoading ? <p className="text-sm text-text-secondary">Loading company details...</p> : null}
            {!detailsLoading && !detail ? <p className="text-sm text-text-secondary">Select a company to inspect its registration and profile.</p> : null}

            {detail ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-heading text-3xl text-text-primary">{detail.companyName}</h2>
                    <p className="mt-2 text-sm text-text-secondary">Status: {statusLabel(detail.accountStatus)}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusClasses(detail.accountStatus)}`}>
                    {detail.verificationStatus}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                    <h3 className="font-semibold text-text-primary">Registration Information</h3>
                    <p className="mt-3">Account email: {detail.registration.accountEmail ?? "-"}</p>
                    <p className="mt-2">Company email: {detail.companyEmail}</p>
                    <p className="mt-2">Commercial registration: {detail.commercialRegistrationNumber}</p>
                    <p className="mt-2">Tax number: {detail.profile.taxNumber}</p>
                    <p className="mt-2">Registered: {new Date(detail.registration.registeredAt).toLocaleString(locale)}</p>
                    <p className="mt-2">Verified at: {detail.verifiedAt ? new Date(detail.verifiedAt).toLocaleString(locale) : "-"}</p>
                  </section>

                  <section className="rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                    <h3 className="font-semibold text-text-primary">Company Profile</h3>
                    <p className="mt-3">Country: {detail.country}</p>
                    <p className="mt-2">City: {detail.city}</p>
                    <p className="mt-2">Address: {detail.profile.address}</p>
                    <p className="mt-2">Website: {detail.profile.website ?? "-"}</p>
                    <p className="mt-2">HR contact: {detail.profile.hrContact}</p>
                    <p className="mt-2">Phone: {detail.profile.phoneNumber}</p>
                    <p className="mt-2">Industry: {detail.profile.industry}</p>
                    <p className="mt-2">Company size: {detail.profile.companySize}</p>
                  </section>
                </div>

                <section className="mt-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                  <h3 className="font-semibold text-text-primary">Uploaded Documents</h3>
                  <div className="mt-4 space-y-3">
                    {detail.documents.map((document) => (
                      <div key={document.id} className="rounded-xl border border-gold/10 px-4 py-3">
                        <p className="text-text-primary">{document.documentType}</p>
                        <p className="mt-1 text-xs text-text-tertiary">{document.originalFilename} • {document.mimeType} • {Math.round(document.sizeBytes / 1024)} KB</p>
                        <p className="mt-1 text-xs text-text-tertiary">Uploaded: {new Date(document.uploadedAt).toLocaleString(locale)}</p>
                        {document.signedUrl ? (
                          <a href={document.signedUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-gold hover:underline">
                            Open document
                          </a>
                        ) : null}
                      </div>
                    ))}
                    {detail.documents.length === 0 ? <p>No uploaded documents.</p> : null}
                  </div>
                </section>

                <section className="mt-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                  <h3 className="font-semibold text-text-primary">Review Notes</h3>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    placeholder="Enter review reason or internal note"
                    className="mt-3 w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
                  />
                  {detail.verificationNotes ? <p className="mt-3">Current note: {detail.verificationNotes}</p> : null}
                </section>

                <section className="mt-4 rounded-2xl border border-gold/15 bg-bg-primary/50 p-4 text-sm text-text-secondary">
                  <h3 className="font-semibold text-text-primary">Deletion Policy</h3>
                  <p className="mt-3">Jobs: {detail.deletionPolicy.jobsCount}</p>
                  <p className="mt-2">Documents: {detail.deletionPolicy.documentsCount}</p>
                  <p className="mt-2">Delete allowed: {detail.deletionPolicy.allowed ? "Yes" : "No"}</p>
                  {detail.deletionPolicy.reasons.length > 0 ? (
                    <ul className="mt-3 space-y-1">
                      {detail.deletionPolicy.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" disabled={acting || !hasSelection} onClick={() => void runAction("approve")} className={primeButtonClasses("primary")}>
                    Approve Company
                  </button>
                  <button type="button" disabled={acting || !hasSelection} onClick={() => void runAction("reject")} className={primeButtonClasses("secondary")}>
                    Reject Company
                  </button>
                  <button type="button" disabled={acting || !hasSelection} onClick={() => void runAction("suspend")} className={primeButtonClasses("secondary")}>
                    Suspend Company
                  </button>
                  <button type="button" disabled={acting || !hasSelection} onClick={() => void runAction("reactivate")} className={primeButtonClasses("secondary")}>
                    Reactivate Company
                  </button>
                  <button type="button" disabled={acting || !hasSelection || !detail.deletionPolicy.allowed} onClick={() => void runAction("delete")} className={primeButtonClasses("secondary")}>
                    Delete Company
                  </button>
                </div>
              </div>
            ) : null}
          </PrimeCard>
        </div>
      </PrimeCard>
    </main>
  );
}