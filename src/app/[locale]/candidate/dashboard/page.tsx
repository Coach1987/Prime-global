"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { asCandidateLocale, localizeCandidateStatus } from "@/lib/candidates/localization";

type DashboardVerificationCase = {
  status?: string | null;
  candidate_message?: string | null;
  updated_at?: string | null;
};

async function readJsonResponse<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text().catch(() => "");

  if (!contentType.includes("application/json")) {
    return { payload: null as T | null, errorMessage: fallbackMessage };
  }

  try {
    return { payload: (bodyText ? (JSON.parse(bodyText) as T) : null) as T | null, errorMessage: null };
  } catch {
    return { payload: null as T | null, errorMessage: fallbackMessage };
  }
}

export default function CandidateDashboardPage() {
  const [hasSession, setHasSession] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [applications, setApplications] = useState<Array<Record<string, unknown>>>([]);
  const [savedJobs, setSavedJobs] = useState<Array<Record<string, unknown>>>([]);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>("pending_ai_analysis");
  const [verificationMessage, setVerificationMessage] = useState<string>("Your documents are waiting for AI verification.");
  const locale = useLocale();
  const isArabic = locale === "ar";
  const uiLocale = asCandidateLocale(locale);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => readJsonResponse<{ success?: boolean; data?: { role?: string } }>(res, "Unable to verify session."))
      .then(({ payload }) => {
        if (!payload?.success || payload?.data?.role !== "candidate") {
          setHasSession(false);
          return;
        }
        setHasSession(true);

        return Promise.all([
          fetch("/api/candidates/profile", { credentials: "include" }),
          fetch("/api/candidates/applications", { credentials: "include" }),
          fetch("/api/candidates/saved-jobs", { credentials: "include" }),
          fetch("/api/candidates/notifications", { credentials: "include" }),
          fetch("/api/candidates/document-verification", { credentials: "include" }),
        ])
          .then(async ([profileRes, applicationsRes, savedJobsRes, notificationsRes, verificationRes]) => {
            const [profilePayload, applicationsPayload, savedJobsPayload, notificationsPayload, verificationPayload] = await Promise.all([
              readJsonResponse<{ success?: boolean; data?: Record<string, unknown> | null }>(profileRes, "Unable to load profile."),
              readJsonResponse<{ success?: boolean; data?: Array<Record<string, unknown>> }>(applicationsRes, "Unable to load applications."),
              readJsonResponse<{ success?: boolean; data?: Array<Record<string, unknown>> }>(savedJobsRes, "Unable to load saved jobs."),
              readJsonResponse<{ success?: boolean; data?: Array<Record<string, unknown>> }>(notificationsRes, "Unable to load notifications."),
              readJsonResponse<{ success?: boolean; data?: { cases?: DashboardVerificationCase[] } }>(verificationRes, "Unable to load verification status."),
            ]);

            setProfile(profilePayload.payload?.data ?? null);
            setApplications(applicationsPayload.payload?.data ?? []);
            setSavedJobs(savedJobsPayload.payload?.data ?? []);
            setNotifications(notificationsPayload.payload?.data ?? []);

            const latestCase = verificationPayload.payload?.data?.cases?.[0] ?? null;
            setVerificationStatus(String(latestCase?.status ?? "pending_ai_analysis"));
            setVerificationMessage(
              String(
                latestCase?.candidate_message ??
                  (isArabic
                    ? "مستنداتك قيد تحليل الذكاء الاصطناعي."
                    : "Your documents are waiting for AI verification.")
              )
            );
          })
          .catch(() => undefined);
      })
      .catch(() => setHasSession(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{isArabic ? "مقابلاتي" : "My Interviews"}</h1>
        <p className="mt-3 text-sm text-text-secondary">
          {isArabic
            ? "دعوات المقابلات المحمية، وجاهزية غرفة الانتظار، وتفاصيل المقابلات الخاضعة للإشراف."
            : "Your protected interview invitations, waiting room readiness, and supervised meeting activity."}
        </p>

        <div className="mt-6 rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{isArabic ? "حالة التحقق" : "Verification"}</p>
          <p className="mt-2 text-lg font-semibold text-gold">{localizeCandidateStatus(verificationStatus, uiLocale)}</p>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">{verificationMessage}</p>
        </div>

        <a href={`/${locale}/matching/v2`} className="mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          {isArabic ? "فتح المطابقة الذكية V2" : "Open AI Matching V2"}
        </a>
        <a href={`/${locale}/candidate/my-interviews`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          {isArabic ? "فتح مقابلاتي" : "Open My Interviews"}
        </a>
        <a href={`/${locale}/candidate/supervised-conversations`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          {isArabic ? "المحادثات الخاضعة للإشراف" : "Supervised Conversations"}
        </a>
        <a href={`/${locale}/candidate/job-alert-settings`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          {isArabic ? "إعدادات تنبيهات الوظائف" : "Job Alert Settings"}
        </a>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [isArabic ? "الملف" : "Profile", profile ? (isArabic ? "مكتمل" : "Complete") : hasSession ? (isArabic ? "قيد الإكمال" : "Pending") : (isArabic ? "بدون جلسة" : "No Session")],
            [isArabic ? "الوظائف المقدَّم عليها" : "Applied Jobs", String(applications.length)],
            [isArabic ? "الوظائف المحفوظة" : "Saved Jobs", String(savedJobs.length)],
            [isArabic ? "الإشعارات" : "Notifications", String(notifications.length)],
          ].map(([label, value], index) => (
            <article key={`${label}-${index}`} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-gold">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
