"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

type CandidateRow = {
  candidate_id: string;
  candidate_reference: string;
  professional_title: string | null;
  professional_summary: string | null;
  general_location: string | null;
  profile_status: string;
  generated_at: string;
  updated_at?: string;
  years_of_experience?: number | null;
  skills?: string[];
  latestDocumentVersion?: {
    identity_confidence_score?: number | null;
    verification_status?: string | null;
  } | null;
  latestVerificationCase?: {
    status?: string | null;
    priority?: string | null;
    updated_at?: string | null;
  } | null;
};

function localizeProfileStatus(status: string, locale: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending_review") return locale === "ar" ? "قيد المراجعة" : "Pending review";
  if (normalized === "approved") return locale === "ar" ? "معتمد" : "Approved";
  if (normalized === "needs_changes") return locale === "ar" ? "يحتاج تعديلات" : "Needs changes";
  if (normalized === "rejected") return locale === "ar" ? "مرفوض" : "Rejected";
  return status;
}

export default function AdminCandidateProfilesPage() {
  const params = useParams<{ locale: string }>();
  const t = useTranslations("ownerPortal.candidateProfiles");
  const locale = String(params.locale ?? "en");
  const [hasSession, setHasSession] = useState(false);
  const [profiles, setProfiles] = useState<CandidateRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const visibleProfiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (statusFilter !== "all" && profile.profile_status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) return true;
      const haystack = [
        profile.candidate_reference,
        profile.professional_title ?? "",
        profile.general_location ?? "",
        ...(profile.skills ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [profiles, search, statusFilter]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) return;
        setHasSession(true);

        return fetch("/api/admin/candidate-profiles?status=all", {
          credentials: "include",
        })
          .then((response) => response.json())
          .then((payload) => setProfiles(payload?.data ?? []));
      })
      .catch(() => setError(t("errors.loadFailed")));
  }, [t]);

  useEffect(() => {
    if (!hasSession) return;
  }, [hasSession]);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{t("title")}</h1>
        <p className="mt-3 text-sm text-text-secondary">{t("subtitle")}</p>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary"
          >
            <option value="all">{t("filters.all")}</option>
            <option value="pending_review">{t("filters.pendingReview")}</option>
            <option value="approved">{t("filters.approved")}</option>
            <option value="needs_changes">{t("filters.needsChanges")}</option>
            <option value="rejected">{t("filters.rejected")}</option>
          </select>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">{t("stats.total")}</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">{profiles.length}</p>
          </div>
          <div className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">{t("stats.pending")}</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">{profiles.filter((item) => item.profile_status === "pending_review").length}</p>
          </div>
          <div className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary">{t("stats.approved")}</p>
            <p className="mt-2 text-2xl font-semibold text-text-primary">{profiles.filter((item) => item.profile_status === "approved").length}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {visibleProfiles.map((profile) => (
            <Link
              key={profile.candidate_id}
              href={`/${locale}/admin/candidate-profiles/${profile.candidate_id}`}
              className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5 transition hover:border-gold/40 hover:bg-bg-primary"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-text-primary">{profile.candidate_reference}</h2>
                <span className="rounded-full border border-gold/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-gold">
                  {localizeProfileStatus(profile.profile_status, locale)}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{profile.professional_title ?? t("emptyProfile")}</p>
              <p className="mt-2 text-sm text-text-tertiary">{profile.general_location ?? t("emptyLocation")}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-tertiary">
                <span>{t("aiScore")}: {profile.latestDocumentVersion?.identity_confidence_score ?? "-"}</span>
                <span>{t("experience")}: {profile.years_of_experience ?? "-"}</span>
                <span>{t("visibility")}: {profile.profile_status === "approved" ? t("visible") : t("hidden")}</span>
              </div>
              <p className="mt-2 text-xs text-text-tertiary">
                {t("timeline")}: {profile.latestVerificationCase?.status ?? t("noTimeline")}
              </p>
              {(profile.skills ?? []).length > 0 ? (
                <p className="mt-2 line-clamp-1 text-xs text-text-tertiary">
                  {t("skills")}: {(profile.skills ?? []).slice(0, 6).join(", ")}
                </p>
              ) : null}
            </Link>
          ))}
        </div>

        {visibleProfiles.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gold/20 bg-bg-primary/70 p-8 text-center">
            <h2 className="font-heading text-2xl text-text-primary">{t("emptyTitle")}</h2>
            <p className="mt-3 text-sm text-text-secondary">{t("emptyBody")}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">
              {t("emptyAction")}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
