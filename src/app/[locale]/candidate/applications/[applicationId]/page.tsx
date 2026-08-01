"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { asCandidateLocale, localizeCandidateStatus } from "@/lib/candidates/localization";

type StatusEvent = {
  id: string;
  previous_status: string | null;
  next_status: string;
  note: string | null;
  created_at: string;
};

type NotificationEvent = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_read?: boolean;
};

type ApplicationDetail = {
  id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  cover_letter?: string | null;
  jobs?: {
    id: string;
    title: string;
    country?: string | null;
    city?: string | null;
    employment_type?: string | null;
    responsibilities?: string | null;
    requirements?: string | null;
    application_deadline?: string | null;
    employers?: { company_name?: string | null }[] | { company_name?: string | null } | null;
  } | null;
  statusHistory: StatusEvent[];
  notifications: NotificationEvent[];
};

export default function CandidateApplicationDetailsPage() {
  const params = useParams<{ applicationId: string }>();
  const locale = useLocale();
  const isArabic = locale === "ar";
  const uiLocale = asCandidateLocale(locale);
  const applicationId = String(params.applicationId ?? "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);

  useEffect(() => {
    if (!applicationId) return;

    let cancelled = false;
    async function loadDetails() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/candidates/applications/${applicationId}`, {
          credentials: "include",
        });
        const payload = await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message ?? "Unable to load application details");
        }

        if (!cancelled) {
          setApplication(payload.data as ApplicationDetail);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load application details");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  const employerName = useMemo(() => {
    const raw = application?.jobs?.employers;
    if (!raw) return isArabic ? "صاحب عمل" : "Employer";
    if (Array.isArray(raw)) return raw[0]?.company_name ?? (isArabic ? "صاحب عمل" : "Employer");
    return raw.company_name ?? (isArabic ? "صاحب عمل" : "Employer");
  }, [application?.jobs?.employers, isArabic]);

  if (loading) {
    return <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">{isArabic ? "جاري التحميل..." : "Loading..."}</main>;
  }

  if (error || !application) {
    return (
      <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-red-300/30 bg-red-500/10 p-6 text-sm text-red-100">
          {error ?? (isArabic ? "تعذر تحميل الطلب." : "Unable to load application.")}
        </section>
      </main>
    );
  }

  const location = [application.jobs?.city, application.jobs?.country].filter(Boolean).join(", ");

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">{isArabic ? "تفاصيل الطلب" : "Application Details"}</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {application.jobs?.title ?? "-"} · {employerName}
        </p>
        <p className="mt-1 text-sm text-text-secondary">{location || (isArabic ? "الموقع غير محدد" : "Location not specified")}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/65 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "الحالة الحالية" : "Current Status"}</p>
            <p className="mt-2 text-lg font-semibold text-gold">{localizeCandidateStatus(application.status, uiLocale)}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/65 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "تاريخ التقديم" : "Submission Date"}</p>
            <p className="mt-2 text-sm text-text-primary" dir={isArabic ? "rtl" : "ltr"}>{new Date(application.applied_at).toLocaleString(locale)}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/65 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "حالة القائمة المختصرة" : "Shortlist Status"}</p>
            <p className="mt-2 text-sm text-text-primary">{application.statusHistory.some((item) => item.next_status === "shortlisted") ? localizeCandidateStatus("shortlisted", uiLocale) : (isArabic ? "غير مدرج" : "Not shortlisted")}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/65 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "حالة المقابلة" : "Interview Status"}</p>
            <p className="mt-2 text-sm text-text-primary">{application.statusHistory.some((item) => item.next_status.includes("interview")) ? localizeCandidateStatus("interview_requested", uiLocale) : (isArabic ? "لا يوجد" : "Not requested")}</p>
          </article>
        </div>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/65 p-5">
          <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "ملخص الوظيفة" : "Job Summary"}</h2>
          <p className="mt-3 text-sm text-text-secondary">{application.jobs?.responsibilities || application.jobs?.requirements || "-"}</p>
        </section>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/65 p-5">
          <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "سجل الحالة" : "Status Timeline"}</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {application.statusHistory.map((item) => (
              <li key={item.id}>
                {localizeCandidateStatus(item.previous_status ?? "new", uiLocale)} {"->"} {localizeCandidateStatus(item.next_status, uiLocale)} ({new Date(item.created_at).toLocaleString(locale)})
                {item.note ? ` - ${item.note}` : ""}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/65 p-5">
          <h2 className="text-lg font-semibold text-text-primary">{isArabic ? "الإشعارات المرتبطة" : "Related Notifications"}</h2>
          {application.notifications.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">{isArabic ? "لا توجد إشعارات مرتبطة بهذا الطلب." : "No notifications linked to this application yet."}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {application.notifications.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold text-text-primary">{item.title}</span> - {item.body}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/candidate/applications" className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10">
            {isArabic ? "العودة إلى الطلبات" : "Back to Applications"}
          </Link>
          {application.status !== "withdrawn" ? (
            <span className="rounded-full border border-blue-300/35 px-5 py-2 text-sm font-semibold text-blue-100">
              {isArabic ? "يمكنك سحب الطلب من صفحة الطلبات" : "You can withdraw this application from the Applications page"}
            </span>
          ) : null}
        </div>
      </section>
    </main>
  );
}
