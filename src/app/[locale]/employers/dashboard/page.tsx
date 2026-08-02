"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";

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

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-[124px] sm:px-6 md:px-8">
        <p className="text-sm text-text-secondary">{isArabic ? "جارٍ تحميل لوحة الشركة..." : "Loading employer dashboard..."}</p>
      </main>
    );
  }

  if (!hasSession) {
    return null;
  }

  const needsProfile = stats.verificationStatus === "not_submitted";

  return (
    <main className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{isArabic ? "لوحة الشركة" : "Dashboard"}</h1>

        {needsProfile ? (
          <p className="mt-3 text-sm text-text-secondary">
            {isArabic ? "أكمل ملف الشركة للبدء." : "Complete your company profile to begin."}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "حالة التحقق" : "Verification"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{verificationLabel}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "إجمالي الوظائف" : "Total Jobs"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.totalJobs}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "الوظائف المنشورة" : "Published Jobs"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.publishedJobs}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "المتقدمون" : "Applicants"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.totalApplicants}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">{isArabic ? "الإعلانات" : "Advertisements"}</p>
            <p className="mt-2 text-2xl font-semibold text-gold">{stats.totalAdvertisements}</p>
          </article>
        </div>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
          <h2 className="font-heading text-2xl text-text-primary">{isArabic ? "الإجراءات الأساسية" : "Primary Actions"}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/employers/company-profile" className="rounded-xl border border-gold/30 px-4 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
              {isArabic ? "أكمل ملف الشركة" : "Complete company profile"}
            </Link>
            <Link href="/employers/jobs" className="rounded-xl border border-gold/30 px-4 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
              {isArabic ? "إنشاء وظيفة" : "Create job"}
            </Link>
            <Link href="/employers/candidate-profiles" className="rounded-xl border border-gold/30 px-4 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
              {isArabic ? "مراجعة المترشحين" : "Review candidates"}
            </Link>
            <Link href="/employers/advertisements" className="rounded-xl border border-gold/30 px-4 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
              {isArabic ? "إنشاء إعلان" : "Create advertisement"}
            </Link>
          </div>
        </section>

        <p className="mt-5 text-xs text-text-tertiary">
          {isArabic ? "تنبيه: سيتم عرض التحديثات المهمة ضمن هذه اللوحة." : "Notice: Important updates appear in this dashboard."}
        </p>
      </section>
    </main>
  );
}
