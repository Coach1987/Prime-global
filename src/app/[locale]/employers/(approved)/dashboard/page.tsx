"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { EmployerTourLauncher } from "@/features/employers/tour/EmployerTourLauncher";
import {
  employerPageShell,
  employerPrimaryButton,
  employerSectionCard,
  employerSurfaceCard,
} from "@/features/employers/ui/portal-theme";

type EmployerStats = {
  totalJobs: number;
  publishedJobs: number;
  totalApplicants: number;
  totalAdvertisements: number;
  verificationStatus: string;
  accountStatus?: "pending_review" | "approved" | "rejected" | "suspended" | null;
};

const EMPTY_STATS: EmployerStats = {
  totalJobs: 0,
  publishedJobs: 0,
  totalApplicants: 0,
  totalAdvertisements: 0,
  verificationStatus: "not_submitted",
  accountStatus: "pending_review",
};

export default function EmployerDashboardPage() {
  const locale = useLocale();
  const router = useRouter();
  const isArabic = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [stats, setStats] = useState<EmployerStats>(EMPTY_STATS);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const mePayload = await meRes.json();
        const employerSession = Boolean(mePayload?.success && mePayload?.data?.role === "employer");
        setHasSession(employerSession);

        if (!employerSession) {
          setStats(EMPTY_STATS);
          return;
        }

        const statsRes = await fetch("/api/employers/stats", { credentials: "include", cache: "no-store" });
        const statsPayload = await statsRes.json();

        const profileRes = await fetch("/api/employers/profile", { credentials: "include", cache: "no-store" });
        const profilePayload = await profileRes.json().catch(() => null);
        setCompanyName(typeof profilePayload?.data?.company_name === "string" ? profilePayload.data.company_name : null);

        if (statsRes.ok && statsPayload?.success && statsPayload?.data) {
          setStats({ ...EMPTY_STATS, ...statsPayload.data });
          return;
        }

        setStats(EMPTY_STATS);
      } catch {
        setStats(EMPTY_STATS);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!loading && !hasSession) {
      router.push("/auth?mode=signin&audience=employer");
    }
  }, [hasSession, loading, router]);

  const verificationLabel = useMemo(() => {
    if (stats.accountStatus === "approved" || stats.verificationStatus === "verified") {
      return isArabic ? "معتمد" : "Approved";
    }
    if (stats.accountStatus === "rejected" || stats.verificationStatus === "rejected") {
      return isArabic ? "مرفوض" : "Rejected";
    }
    if (stats.accountStatus === "suspended" || stats.verificationStatus === "suspended") {
      return isArabic ? "موقوف" : "Suspended";
    }
    return isArabic ? "قيد المراجعة" : "Pending Review";
  }, [isArabic, stats.accountStatus, stats.verificationStatus]);

  const workflowStepLabel = useMemo(() => {
    if (!companyName || stats.verificationStatus === "not_submitted") {
      return isArabic ? "أكمل ملف الشركة" : "Complete company profile";
    }
    if (stats.accountStatus === "approved" || stats.verificationStatus === "verified") {
      return isArabic ? "إدارة التوظيف النشط" : "Manage active hiring";
    }
    if (stats.accountStatus === "rejected" || stats.verificationStatus === "rejected") {
      return isArabic ? "تحديث البيانات وإعادة الإرسال" : "Update profile and resubmit verification";
    }
    if (stats.accountStatus === "suspended" || stats.verificationStatus === "suspended") {
      return isArabic ? "مراجعة الحساب مطلوبة" : "Account review required";
    }
    return isArabic ? "بانتظار مراجعة التحقق" : "Awaiting verification review";
  }, [companyName, isArabic, stats.accountStatus, stats.verificationStatus]);

  if (loading) {
    return (
      <main className={employerPageShell}>
        <p className="text-sm text-text-secondary">{isArabic ? "جارٍ تحميل لوحة الشركة..." : "Loading employer dashboard..."}</p>
      </main>
    );
  }

  if (!hasSession) {
    return null;
  }

  const needsProfile = stats.verificationStatus === "not_submitted";

  return (
    <main className={employerPageShell}>
      <EmployerTourLauncher showEntry={false} />
      <section className={employerSurfaceCard} data-tour="ready-to-recruit">
        <div className="rounded-2xl border border-gold/20 bg-bg-primary/65 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">{isArabic ? "مركز القيادة" : "Command Center"}</p>
          <h1 className="mt-3 font-heading text-4xl text-text-primary">
            {isArabic
              ? `مرحباً${companyName ? `، ${companyName}` : ""}`
              : `Welcome${companyName ? `, ${companyName}` : ""}`}
          </h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className={employerSectionCard}>
              <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "حالة التحقق" : "Verification Status"}</p>
              <p className="mt-2 text-lg font-semibold text-gold">{verificationLabel}</p>
            </div>
            <div className={employerSectionCard}>
              <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "الخطوة الحالية" : "Current Workflow Step"}</p>
              <p className="mt-2 text-lg font-semibold text-text-primary">{workflowStepLabel}</p>
            </div>
          </div>
          {needsProfile ? (
            <p className="mt-4 text-sm text-text-secondary">
              {isArabic ? "أكمل ملف الشركة للبدء." : "Complete your company profile to begin."}
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className={employerSectionCard}>
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "إجمالي الوظائف" : "Total Jobs"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.totalJobs}</p>
          </article>
          <article className={employerSectionCard}>
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "الوظائف المنشورة" : "Published Jobs"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.publishedJobs}</p>
          </article>
          <article className={employerSectionCard}>
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "المتقدمون" : "Applicants"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.totalApplicants}</p>
          </article>
          <article className={employerSectionCard}>
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "الإعلانات" : "Advertisements"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.totalAdvertisements}</p>
          </article>
        </div>

        <section className="mt-8">
          <article className={employerSectionCard}>
            <h2 className="font-heading text-2xl text-text-primary">{isArabic ? "الإجراءات السريعة" : "Quick Actions"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/employers/company-profile" className={employerPrimaryButton}>
                {isArabic ? "أكمل ملف الشركة" : "Complete Company Profile"}
              </Link>
              <Link href="/employers/jobs" className={employerPrimaryButton}>
                {isArabic ? "إنشاء وظيفة" : "Create Job"}
              </Link>
              <Link href="/employers/advertisements" className={employerPrimaryButton}>
                {isArabic ? "إنشاء إعلان" : "Create Advertisement"}
              </Link>
              <Link href="/employers/candidate-profiles" className={employerPrimaryButton}>
                {isArabic ? "مراجعة المترشحين" : "Review Candidates"}
              </Link>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
