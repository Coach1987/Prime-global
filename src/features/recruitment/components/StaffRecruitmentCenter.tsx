"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type StaffOverview = {
  requests: Array<Record<string, unknown>>;
  conversations: Array<Record<string, unknown>>;
  moderationQueue: Array<Record<string, unknown>>;
  auditHistory: Array<Record<string, unknown>>;
};

function getCopy(locale: string) {
  const isArabic = locale === "ar";
  return {
    title: isArabic ? "مركز التحكم" : "Control Center",
    subtitle: isArabic
      ? "إدارة طلبات المحادثات، الإسناد، الإشراف، المراجعة، وجدولة المقابلات من مكان واحد."
      : "Manage conversation requests, assignments, supervision, moderation, and interview scheduling from one place.",
    requests: isArabic ? "قائمة الطلبات" : "Request queue",
    moderation: isArabic ? "طابور المراجعة" : "Moderation queue",
    conversations: isArabic ? "المحادثات المكلّف بها" : "Assigned conversations",
    audit: isArabic ? "السجل التدقيقي" : "Audit history",
    assign: isArabic ? "إسناد إليّ" : "Assign to me",
    approve: isArabic ? "موافقة" : "Approve",
    reject: isArabic ? "رفض" : "Reject",
    approveMessage: isArabic ? "إجازة الرسالة" : "Approve message",
    rejectMessage: isArabic ? "رفض الرسالة" : "Reject message",
    open: isArabic ? "فتح" : "Open",
    notice: isArabic
      ? "تخضع هذه المحادثة لإشراف برايم جلوبال. لا يُسمح بتبادل بيانات التواصل المباشر أو نقل التواصل خارج المنصة أثناء إجراءات التوظيف."
      : "This conversation is supervised by Prime Global. Direct contact information and communication outside the platform are not permitted during the recruitment process.",
  };
}

export function StaffRecruitmentCenter({ locale }: { locale: string }) {
  const [token, setToken] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [data, setData] = useState<StaffOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = useMemo(() => getCopy(locale), [locale]);

  const loadOverview = useCallback(async (accessToken: string) => {
    const response = await fetch(`/api/recruitment/staff/overview?locale=${locale}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to load overview");
      return;
    }
    setData(payload.data);
  }, [locale]);

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    setToken(accessToken);

    if (!accessToken) {
      setError(locale === "ar" ? "يرجى تسجيل الدخول للوصول." : "Please sign in to continue.");
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => response.json())
      .then((payload) => {
        const currentRole = String(payload?.data?.role ?? "");
        if (!payload?.success) {
          setError(locale === "ar" ? "فشل التحقق من الجلسة." : "Session verification failed.");
          return;
        }

        const isStaff = currentRole === "prime_global_recruiter" || currentRole === "prime_global_admin" || currentRole === "admin" || currentRole === "super_admin";
        if (!isStaff) {
          setError(locale === "ar" ? "هذه الصفحة مخصصة لفريق برايم جلوبال." : "This page is restricted to Prime Global staff.");
          return;
        }
        setIsAuthorized(true);
      })
      .catch(() => setError(locale === "ar" ? "تعذر التحقق من الجلسة." : "Unable to verify session."));

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    if (!accessToken) return;
    loadOverview(accessToken).catch(() => setError(locale === "ar" ? "تعذر تحميل البيانات." : "Unable to load data."));
  }, [loadOverview, locale]);

  useEffect(() => {
    if (!token || !isAuthorized) return;
    loadOverview(token).catch(() => setError(locale === "ar" ? "تعذر تحميل البيانات." : "Unable to load data."));
  }, [token, isAuthorized, loadOverview, locale]);

  async function reviewRequest(requestId: string, action: "assign" | "approve" | "reject") {
    if (!token) return;

    const rejectionReason = action === "reject" ? window.prompt(locale === "ar" ? "سبب الرفض" : "Rejection reason") ?? undefined : undefined;
    const response = await fetch(`/api/recruitment/conversation-requests/${requestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action, rejectionReason, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to update request");
      return;
    }
    await loadOverview(token);
  }

  async function moderate(messageId: string, action: "approve" | "reject") {
    if (!token) return;

    const response = await fetch(`/api/recruitment/messages/${messageId}/moderation`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to moderate message");
      return;
    }
    await loadOverview(token);
  }

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{copy.title}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{copy.subtitle}</p>
        <div className="prime-auth-card mt-6 p-5 text-sm leading-7 text-text-secondary">
          {copy.notice}
        </div>
        {error ? <p className="mt-5 text-sm text-red-300">{error}</p> : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">{copy.requests}</h2>
            <div className="mt-4 space-y-3">
              {(data?.requests ?? []).map((request) => (
                <PrimeCard key={String(request.id)} className="p-4">
                  <p className="text-sm font-medium text-text-primary">{String((request.candidateProfile as Record<string, unknown> | undefined)?.candidate_reference ?? "PG Candidate")}</p>
                  <p className="mt-2 text-sm text-text-secondary">{String(request.status ?? "pending")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => reviewRequest(String(request.id), "assign")} className={primeButtonClasses("secondary", "sm")}>{copy.assign}</button>
                    <button onClick={() => reviewRequest(String(request.id), "approve")} className={primeButtonClasses("secondary", "sm")}>{copy.approve}</button>
                    <button onClick={() => reviewRequest(String(request.id), "reject")} className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-200">{copy.reject}</button>
                  </div>
                </PrimeCard>
              ))}
            </div>
          </PrimeCard>

          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">{copy.moderation}</h2>
            <div className="mt-4 space-y-3">
              {(data?.moderationQueue ?? []).map((item) => (
                <PrimeCard key={String(item.id)} className="p-4">
                  <p className="text-sm text-text-primary">{String(item.body ?? "")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => moderate(String(item.id), "approve")} className={primeButtonClasses("secondary", "sm")}>{copy.approveMessage}</button>
                    <button onClick={() => moderate(String(item.id), "reject")} className="rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-200">{copy.rejectMessage}</button>
                  </div>
                </PrimeCard>
              ))}
            </div>
          </PrimeCard>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">{copy.conversations}</h2>
            <div className="mt-4 space-y-3">
              {(data?.conversations ?? []).map((conversation) => (
                <PrimeCard key={String(conversation.id)} className="p-4">
                  <p className="text-sm font-medium text-text-primary">{String((conversation.employer as Record<string, unknown> | undefined)?.company_name ?? "Employer")}</p>
                  <p className="mt-2 text-sm text-text-secondary">{String((conversation.candidateProfile as Record<string, unknown> | undefined)?.candidate_reference ?? "PG Candidate")}</p>
                  <a href={`/${locale}/admin/recruitment/${String(conversation.id)}`} className={`${primeButtonClasses("secondary")} mt-4`}>{copy.open}</a>
                </PrimeCard>
              ))}
            </div>
          </PrimeCard>

          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">{copy.audit}</h2>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              {(data?.auditHistory ?? []).map((item) => (
                <PrimeCard key={String(item.id)} className="p-4">
                  <p className="text-text-primary">{String(item.action ?? "audit")}</p>
                  <p className="mt-2 text-xs text-text-tertiary">{String(item.created_at ?? "")}</p>
                </PrimeCard>
              ))}
            </div>
          </PrimeCard>
        </section>
      </PrimeCard>
    </main>
  );
}