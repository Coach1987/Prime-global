"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type StaffOverview = {
  requests: Array<Record<string, unknown>>;
  conversations: Array<Record<string, unknown>>;
  moderationQueue: Array<Record<string, unknown>>;
};

function getCopy(locale: string) {
  const isArabic = locale === "ar";
  return {
    title: isArabic ? "مركز التوظيف" : "Recruitment Center",
    subtitle: isArabic
      ? "إدارة طلبات المحادثة ومراجعة الرسائل والمحادثات النشطة من شاشة واحدة."
      : "Manage conversation requests, message moderation, and active conversations from one screen.",
    notice: isArabic
      ? "تخضع المحادثات لإشراف برايم جلوبال. لا يُسمح بتبادل بيانات التواصل المباشر أو نقل التواصل خارج المنصة أثناء إجراءات التوظيف."
      : "Conversations are supervised by Prime Global. Direct contact information and communication outside the platform are not permitted during recruitment.",
    requests: isArabic ? "طلبات المحادثة" : "Conversation requests",
    moderation: isArabic ? "مراجعة الرسائل" : "Message moderation",
    conversations: isArabic ? "المحادثات النشطة" : "Active conversations",
    assign: isArabic ? "إسناد إليّ" : "Assign to me",
    approve: isArabic ? "موافقة" : "Approve",
    reject: isArabic ? "رفض" : "Reject",
    open: isArabic ? "فتح" : "Open",
    empty: isArabic ? "لا توجد عناصر حالياً." : "No items right now.",
    candidateFallback: isArabic ? "مرشح برايم جلوبال" : "PG Candidate",
    employerFallback: isArabic ? "صاحب عمل" : "Employer",
    requestUpdateFailed: isArabic ? "تعذر تحديث الطلب." : "Failed to update request.",
    moderationFailed: isArabic ? "تعذر مراجعة الرسالة." : "Failed to moderate message.",
    overviewLoadFailed: isArabic ? "تعذر تحميل بيانات المركز." : "Failed to load center data.",
    sessionFailed: isArabic ? "تعذر التحقق من الجلسة." : "Unable to verify session.",
    restricted: isArabic ? "هذه الصفحة مخصصة لفريق برايم جلوبال." : "This page is restricted to Prime Global staff.",
    loading: isArabic ? "جارٍ تحميل مركز التوظيف..." : "Loading recruitment center...",
    statusPending: isArabic ? "قيد الانتظار" : "Pending",
    statusApproved: isArabic ? "معتمد" : "Approved",
    statusRejected: isArabic ? "مرفوض" : "Rejected",
    statusAssigned: isArabic ? "مُسند" : "Assigned",
  };
}

function localizeQueueStatus(status: string, locale: string, copy: ReturnType<typeof getCopy>) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending" || normalized === "pending_review") return copy.statusPending;
  if (normalized === "approved") return copy.statusApproved;
  if (normalized === "rejected") return copy.statusRejected;
  if (normalized === "assigned") return copy.statusAssigned;
  if (locale === "ar") return copy.statusPending;
  return status;
}

export function StaffRecruitmentCenter({ locale }: { locale: string }) {
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [data, setData] = useState<StaffOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = useMemo(() => getCopy(locale), [locale]);

  const loadOverview = useCallback(async () => {
    const response = await fetch(`/api/recruitment/staff/overview?locale=${locale}`, {
      credentials: "include",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? copy.overviewLoadFailed);
      return;
    }
    setData(payload.data);
  }, [copy.overviewLoadFailed, locale]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        const currentRole = String(payload?.data?.role ?? "");
        if (!payload?.success) {
          setError(copy.sessionFailed);
          return;
        }

        const isStaff =
          currentRole === "prime_global_recruiter" ||
          currentRole === "prime_global_admin" ||
          currentRole === "admin" ||
          currentRole === "super_admin";
        if (!isStaff) {
          setError(copy.restricted);
          return;
        }

        setHasSession(true);
        void loadOverview();
      })
      .catch(() => setError(copy.sessionFailed))
      .finally(() => setLoading(false));

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, [copy.restricted, copy.sessionFailed, loadOverview]);

  async function reviewRequest(requestId: string, action: "assign" | "approve" | "reject") {
    if (!hasSession) return;

    const rejectionReason = action === "reject" ? window.prompt(locale === "ar" ? "سبب الرفض" : "Rejection reason") ?? undefined : undefined;
    const response = await fetch(`/api/recruitment/conversation-requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ action, rejectionReason, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? copy.requestUpdateFailed);
      return;
    }
    await loadOverview();
  }

  async function moderate(messageId: string, action: "approve" | "reject") {
    if (!hasSession) return;

    const response = await fetch(`/api/recruitment/messages/${messageId}/moderation`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ action, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? copy.moderationFailed);
      return;
    }
    await loadOverview();
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <PrimeCard as="section" className="p-7 md:p-10">
          <PrimePageTitle>{copy.title}</PrimePageTitle>
          <p className="mt-3 text-sm text-text-secondary">{copy.loading}</p>
        </PrimeCard>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{copy.title}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{copy.subtitle}</p>
        <div className="prime-auth-card mt-6 p-5 text-sm leading-7 text-text-secondary">{copy.notice}</div>
        {error ? <p className="mt-5 text-sm text-red-300">{error}</p> : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-3">
          <PrimeCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl text-text-primary">{copy.requests}</h2>
              <span className="rounded-full border border-gold/15 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-gold">
                {(data?.requests ?? []).length}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {(data?.requests ?? []).map((request) => (
                <PrimeCard key={String(request.id)} className="p-4">
                  <p className="text-sm font-medium text-text-primary">
                    {String((request.candidateProfile as Record<string, unknown> | undefined)?.candidate_reference ?? copy.candidateFallback)}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    {localizeQueueStatus(String(request.status ?? "pending"), locale, copy)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => reviewRequest(String(request.id), "assign")} className={primeButtonClasses("secondary", "sm")}>{copy.assign}</button>
                    <button onClick={() => reviewRequest(String(request.id), "approve")} className={primeButtonClasses("secondary", "sm")}>{copy.approve}</button>
                    <button onClick={() => reviewRequest(String(request.id), "reject")} className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-200">{copy.reject}</button>
                  </div>
                </PrimeCard>
              ))}
              {(data?.requests ?? []).length === 0 ? <p className="text-sm text-text-secondary">{copy.empty}</p> : null}
            </div>
          </PrimeCard>

          <PrimeCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl text-text-primary">{copy.moderation}</h2>
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-200">
                {(data?.moderationQueue ?? []).length}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {(data?.moderationQueue ?? []).map((item) => (
                <PrimeCard key={String(item.id)} className="p-4">
                  <p className="text-sm text-text-primary">{String(item.body ?? "")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => moderate(String(item.id), "approve")} className={primeButtonClasses("secondary", "sm")}>{copy.approve}</button>
                    <button onClick={() => moderate(String(item.id), "reject")} className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-200">{copy.reject}</button>
                  </div>
                </PrimeCard>
              ))}
              {(data?.moderationQueue ?? []).length === 0 ? <p className="text-sm text-text-secondary">{copy.empty}</p> : null}
            </div>
          </PrimeCard>

          <PrimeCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl text-text-primary">{copy.conversations}</h2>
              <span className="rounded-full border border-blue-200/20 bg-blue-200/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-blue-100">
                {(data?.conversations ?? []).length}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {(data?.conversations ?? []).map((conversation) => (
                <PrimeCard key={String(conversation.id)} className="p-4">
                  <p className="text-sm font-medium text-text-primary">
                    {String((conversation.employer as Record<string, unknown> | undefined)?.company_name ?? copy.employerFallback)}
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    {String((conversation.candidateProfile as Record<string, unknown> | undefined)?.candidate_reference ?? copy.candidateFallback)}
                  </p>
                  <a href={`/${locale}/admin/recruitment/${String(conversation.id)}`} className={`${primeButtonClasses("secondary")} mt-4`}>{copy.open}</a>
                </PrimeCard>
              ))}
              {(data?.conversations ?? []).length === 0 ? <p className="text-sm text-text-secondary">{copy.empty}</p> : null}
            </div>
          </PrimeCard>
        </section>
      </PrimeCard>
    </main>
  );
}
