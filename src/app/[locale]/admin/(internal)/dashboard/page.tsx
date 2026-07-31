"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type AuditEntry = {
  id: string;
  action: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  reason: string | null;
  createdAt: string;
};

type DashboardPayload = {
  executive?: {
    pendingCompanies?: number;
    pendingAdvertisements?: number;
    pendingJobs?: number;
    pendingCandidateAiReviews?: number;
    interviewsToday?: number;
    criticalAlerts?: number;
    systemNotifications?: number;
    moderationQueue?: number;
    pendingConversationRequests?: number;
    recruitersAssigned?: number;
    aiQueue?: number;
  };
  reports?: {
    recentImportantActivities?: AuditEntry[];
    systemNotifications?: Array<{ id: string; title: string; body: string; createdAt: string; isRead: boolean }>;
    recentCriticalCases?: Array<{ id: string; candidateId: string; status: string; priority: string; updatedAt: string }>;
    recentAuditLogs?: AuditEntry[];
  };
  analyticsSeries?: {
    weeklyActivity?: Array<{ date: string; value: number }>;
    monthlyReports?: Array<{ month: string; value: number }>;
    recruitmentKpis?: {
      requestsApproved?: number;
      requestsRejected?: number;
      interviewsStarted?: number;
      aiAssists?: number;
    };
    aiStatistics?: {
      pendingManualReview?: number;
      criticalCases?: number;
      aiQueue?: number;
    };
    businessOverview?: {
      companiesVerified?: number;
      activeJobs?: number;
      applications?: number;
      candidates?: number;
    };
  };
};

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function localizeActorRole(role: string, locale: string) {
  const normalized = role.trim().toLowerCase();
  if (locale !== "ar") return role;

  if (normalized === "prime_global_recruiter") return "مجند";
  if (normalized === "prime_global_admin") return "مالك";
  if (normalized === "admin") return "مسؤول";
  if (normalized === "super_admin") return "مسؤول أعلى";
  if (normalized === "employer") return "صاحب عمل";
  if (normalized === "candidate") return "مرشح";
  return "غير معروف";
}

function toSentence(entry: AuditEntry, locale: string, t: ReturnType<typeof useTranslations>) {
  const target = entry.targetLabel || entry.targetId || t("audit.unknownTarget");
  if (entry.action === "admin.employer.approve") {
    return t("audit.ownerApprovedCompany", { company: target });
  }
  if (entry.action === "admin.employer.reject") {
    return t("audit.ownerRejectedCompany", { company: target });
  }
  if (entry.action === "admin.employer.suspend") {
    return t("audit.ownerSuspendedCompany", { company: target });
  }
  if (entry.action === "admin.employer.reactivate") {
    return t("audit.ownerReactivatedCompany", { company: target });
  }

  const fallbackAction = locale === "ar" ? "إجراء إداري" : entry.action;
  return t("audit.fallback", { action: fallbackAction, target });
}

export default function AdminDashboardPage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params.locale ?? "en");
  const t = useTranslations("ownerPortal.dashboard");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) return;
        return fetch("/api/admin/platform", { credentials: "include" })
          .then((res) => res.json())
          .then((payload) => {
            setDashboard((payload?.data ?? null) as DashboardPayload | null);
          });
      })
      .catch(() => undefined);
  }, []);

  const executive = dashboard?.executive;
  const auditLogs = dashboard?.reports?.recentAuditLogs ?? [];
  const weekly = dashboard?.analyticsSeries?.weeklyActivity ?? [];
  const monthly = dashboard?.analyticsSeries?.monthlyReports ?? [];
  const maxWeekly = Math.max(1, ...weekly.map((item) => item.value));
  const maxMonthly = Math.max(1, ...monthly.map((item) => item.value));

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{t("title")}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{t("subtitle")}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="./control-center" className={primeButtonClasses("secondary")}>
            {t("quickActions.openControlCenter")}
          </Link>
          <Link href="./recruitment" className={primeButtonClasses("secondary")}>
            {t("quickActions.openRecruitmentCenter")}
          </Link>
          <Link href="./advertisements" className={primeButtonClasses("secondary")}>
            {t("quickActions.openAdvertisementsCenter")}
          </Link>
          <Link href="./candidate-profiles" className={primeButtonClasses("secondary")}>
            {t("quickActions.openCandidateAiQueue")}
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [t("metrics.companiesToday"), String(executive?.pendingCompanies ?? 0)],
            [t("metrics.jobsToday"), String(executive?.pendingJobs ?? 0)],
            [t("metrics.pendingReviews"), String(executive?.pendingCandidateAiReviews ?? 0)],
            [t("metrics.aiInterviews"), String(executive?.interviewsToday ?? 0)],
            [t("metrics.successfulPlacements"), String(dashboard?.analyticsSeries?.recruitmentKpis?.requestsApproved ?? 0)],
            [t("metrics.revenue"), "—"],
            [t("metrics.activeEmployers"), String(dashboard?.analyticsSeries?.businessOverview?.companiesVerified ?? 0)],
            [t("metrics.activeCandidates"), String(dashboard?.analyticsSeries?.businessOverview?.candidates ?? 0)],
            [t("metrics.systemHealth"), String(executive?.criticalAlerts ?? 0)],
          ].map(([label, value]) => (
            <PrimeCard key={label} className="flex h-full flex-col justify-between rounded-2xl border border-gold/10 bg-bg-primary/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-blue-200">{value}</p>
            </PrimeCard>
          ))}
        </div>

        <section className="mt-10 grid gap-6 xl:grid-cols-2">
          <PrimeCard className="p-6">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.auditLogs")}</h2>
            <p className="mt-2 text-sm text-text-secondary">{t("sections.auditSubtitle")}</p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {auditLogs.slice(0, 12).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedAudit(item)}
                    className="w-full rounded-lg border border-blue-200/15 px-3 py-2 text-left transition hover:border-blue-200/40"
                  >
                    <p className="text-text-primary">{toSentence(item, locale, t)}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{formatDateTime(item.createdAt, locale)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </PrimeCard>

          <PrimeCard className="p-6">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.systemNotifications")}</h2>
            <p className="mt-2 text-sm text-text-secondary">{t("sections.systemNotificationsSubtitle")}</p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {(dashboard?.reports?.systemNotifications ?? []).map((item) => (
                <li key={item.id} className="rounded-lg border border-blue-200/15 px-3 py-2">
                  <p className="text-text-primary">{item.title}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{item.body}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{formatDateTime(item.createdAt, locale)}</p>
                </li>
              ))}
            </ul>
          </PrimeCard>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <PrimeCard className="p-6">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.weeklyActivity")}</h2>
            <div className="mt-4 space-y-2">
              {weekly.map((item) => (
                <div key={item.date} className="grid grid-cols-[110px_minmax(0,1fr)_36px] items-center gap-3 text-xs text-text-secondary">
                  <span>{item.date}</span>
                  <div className="h-2 rounded-full bg-blue-200/10">
                    <div
                      className="h-2 rounded-full bg-blue-200/70"
                      style={{ width: `${Math.max(6, Math.round((item.value / maxWeekly) * 100))}%` }}
                    />
                  </div>
                  <span className="text-right text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </PrimeCard>

          <PrimeCard className="p-6">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.monthlyReports")}</h2>
            <div className="mt-4 space-y-2">
              {monthly.map((item) => (
                <div key={item.month} className="grid grid-cols-[82px_minmax(0,1fr)_36px] items-center gap-3 text-xs text-text-secondary">
                  <span>{item.month}</span>
                  <div className="h-2 rounded-full bg-gold/10">
                    <div
                      className="h-2 rounded-full bg-gold/70"
                      style={{ width: `${Math.max(6, Math.round((item.value / maxMonthly) * 100))}%` }}
                    />
                  </div>
                  <span className="text-right text-text-primary">{item.value}</span>
                </div>
              ))}
            </div>
          </PrimeCard>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <PrimeCard className="p-5">
            <h3 className="text-lg font-semibold text-text-primary">{t("sections.recruitmentKpis")}</h3>
            <p className="mt-3 text-sm text-text-secondary">
              {t("kpis.requestsApproved")}: {dashboard?.analyticsSeries?.recruitmentKpis?.requestsApproved ?? 0}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("kpis.requestsRejected")}: {dashboard?.analyticsSeries?.recruitmentKpis?.requestsRejected ?? 0}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("kpis.interviewsStarted")}: {dashboard?.analyticsSeries?.recruitmentKpis?.interviewsStarted ?? 0}
            </p>
          </PrimeCard>

          <PrimeCard className="p-5">
            <h3 className="text-lg font-semibold text-text-primary">{t("sections.aiStatistics")}</h3>
            <p className="mt-3 text-sm text-text-secondary">
              {t("kpis.pendingManualReview")}: {dashboard?.analyticsSeries?.aiStatistics?.pendingManualReview ?? 0}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("kpis.criticalCases")}: {dashboard?.analyticsSeries?.aiStatistics?.criticalCases ?? 0}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("kpis.aiQueue")}: {dashboard?.analyticsSeries?.aiStatistics?.aiQueue ?? 0}
            </p>
          </PrimeCard>

          <PrimeCard className="p-5">
            <h3 className="text-lg font-semibold text-text-primary">{t("sections.businessOverview")}</h3>
            <p className="mt-3 text-sm text-text-secondary">
              {t("kpis.verifiedCompanies")}: {dashboard?.analyticsSeries?.businessOverview?.companiesVerified ?? 0}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("kpis.activeJobs")}: {dashboard?.analyticsSeries?.businessOverview?.activeJobs ?? 0}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("kpis.applications")}: {dashboard?.analyticsSeries?.businessOverview?.applications ?? 0}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {t("kpis.candidates")}: {dashboard?.analyticsSeries?.businessOverview?.candidates ?? 0}
            </p>
          </PrimeCard>
        </section>
      </PrimeCard>

      {selectedAudit ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedAudit(null)}>
          <aside
            className="h-full w-full max-w-[560px] overflow-y-auto border-l border-gold/20 bg-bg-primary p-6"
            onClick={(event) => event.stopPropagation()}
            aria-label={t("audit.details")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">{t("audit.details")}</p>
                <h3 className="mt-2 font-heading text-2xl text-text-primary">{toSentence(selectedAudit, locale, t)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="rounded-full border border-gold/20 px-3 py-1 text-xs font-semibold text-text-primary"
              >
                {t("audit.close")}
              </button>
            </div>

            <div className="mt-6 space-y-3 text-sm text-text-secondary">
              <PrimeCard className="p-4">
                <p>{t("audit.user")}: {selectedAudit.actorRole ? localizeActorRole(selectedAudit.actorRole, locale) : t("audit.unknownUser")}</p>
                <p className="mt-2">{t("audit.action")}: {locale === "ar" ? "إجراء إداري" : selectedAudit.action}</p>
                <p className="mt-2">
                  {t("audit.target")}: {selectedAudit.targetLabel
                    ? selectedAudit.targetLabel
                    : selectedAudit.targetId
                      ? <span dir="ltr" className="[unicode-bidi:isolate]">{selectedAudit.targetId}</span>
                      : t("audit.unknownTarget")}
                </p>
                <p className="mt-2">{t("audit.dateTime")}: {formatDateTime(selectedAudit.createdAt, locale)}</p>
                {selectedAudit.reason ? <p className="mt-2">{t("audit.reason")}: {selectedAudit.reason}</p> : null}
              </PrimeCard>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
