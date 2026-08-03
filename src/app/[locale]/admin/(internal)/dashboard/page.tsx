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
            [t("metrics.pendingReviews"), String(executive?.pendingCandidateAiReviews ?? 0)],
            [t("metrics.systemHealth"), String(executive?.criticalAlerts ?? 0)],
            [t("metrics.jobsToday"), String(executive?.pendingJobs ?? 0)],
            [t("metrics.aiInterviews"), String(executive?.interviewsToday ?? 0)],
          ].map(([label, value]) => (
            <PrimeCard key={label} className="flex h-full flex-col justify-between rounded-2xl border border-gold/10 bg-bg-primary/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-3 text-2xl font-semibold text-blue-200">{value}</p>
            </PrimeCard>
          ))}
        </div>

        <section className="mt-10">
          <PrimeCard className="p-6">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.auditLogs")}</h2>
            <p className="mt-2 text-sm text-text-secondary">{t("sections.auditSubtitle")}</p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {auditLogs.slice(0, 12).map((item) => (
                <li key={item.id}>
                  <div className="w-full rounded-lg border border-blue-200/15 px-3 py-2 text-left">
                    <p className="text-text-primary">{toSentence(item, locale, t)}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{formatDateTime(item.createdAt, locale)}</p>
                  </div>
                </li>
              ))}
            </ul>
            {auditLogs.length === 0 ? <p className="mt-4 text-sm text-text-secondary">{t("sections.auditSubtitle")}</p> : null}
          </PrimeCard>
        </section>
      </PrimeCard>
    </main>
  );
}
