"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type StaffOverview = {
  requests: Array<Record<string, unknown>>;
  conversations: Array<Record<string, unknown>>;
  moderationQueue: Array<Record<string, unknown>>;
  auditHistory: Array<Record<string, unknown>>;
};

type ExplorerRelatedEntity = {
  id: string;
  label: string;
  subtitle: string | null;
  exists: boolean;
};

type ExplorerEvent = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actor: {
    authUserId: string | null;
    role: string | null;
    fullName: string | null;
    email: string | null;
  };
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  related: {
    candidate: ExplorerRelatedEntity | null;
    employer: ExplorerRelatedEntity | null;
    job: ExplorerRelatedEntity | null;
    advertisement: ExplorerRelatedEntity | null;
    conversation: ExplorerRelatedEntity | null;
    interview: ExplorerRelatedEntity | null;
  };
};

type EventExplorerPayload = {
  items: ExplorerEvent[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type EventExplorerQuery = {
  search: string;
  actionPrefix: string;
  targetType: string;
  sort: "newest" | "oldest";
  page: number;
  pageSize: number;
};

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getEventQuickActions(event: ExplorerEvent, locale: string) {
  const actions: Array<{ id: string; label: string; href: string; disabled?: boolean }> = [];

  if (event.related.candidate) {
    actions.push({
      id: "candidate",
      label: "Open candidate profile",
      href: `/${locale}/admin/candidate-profiles/${event.related.candidate.id}`,
      disabled: !event.related.candidate.exists,
    });
  }

  if (event.related.conversation) {
    actions.push({
      id: "conversation",
      label: "Open conversation",
      href: `/${locale}/admin/recruitment/${event.related.conversation.id}`,
      disabled: !event.related.conversation.exists,
    });
  }

  if (event.related.interview && event.related.conversation?.exists) {
    actions.push({
      id: "interview",
      label: "Open interview",
      href: `/${locale}/admin/recruitment/${event.related.conversation.id}/interviews/${event.related.interview.id}`,
      disabled: !event.related.interview.exists,
    });
  }

  if (event.related.job) {
    actions.push({
      id: "job",
      label: "Open job",
      href: `/${locale}/jobs/${event.related.job.id}`,
      disabled: !event.related.job.exists,
    });
  }

  if (event.related.advertisement) {
    actions.push({
      id: "advertisement",
      label: "Open advertisement board",
      href: `/${locale}/admin/advertisements?highlight=${event.related.advertisement.id}`,
      disabled: !event.related.advertisement.exists,
    });
  }

  if (event.related.employer) {
    actions.push({
      id: "employer",
      label: "Open admin dashboard",
      href: `/${locale}/admin/dashboard?employerId=${event.related.employer.id}`,
      disabled: !event.related.employer.exists,
    });
  }

  return actions;
}

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
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState("");
  const [data, setData] = useState<StaffOverview | null>(null);
  const [events, setEvents] = useState<EventExplorerPayload | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [query, setQuery] = useState<EventExplorerQuery>({
    search: "",
    actionPrefix: "",
    targetType: "",
    sort: "newest",
    page: 1,
    pageSize: 20,
  });
  const [selectedEvent, setSelectedEvent] = useState<ExplorerEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = useMemo(() => getCopy(locale), [locale]);

  const loadOverview = useCallback(async () => {
    const response = await fetch(`/api/recruitment/staff/overview?locale=${locale}`, {
      credentials: "include",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to load overview");
      return;
    }
    setData(payload.data);
  }, [locale]);

  const loadEvents = useCallback(async (nextQuery: EventExplorerQuery) => {
    setEventsLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(nextQuery.page));
    params.set("pageSize", String(nextQuery.pageSize));
    params.set("sort", nextQuery.sort);
    if (nextQuery.search.trim()) params.set("search", nextQuery.search.trim());
    if (nextQuery.actionPrefix.trim()) params.set("actionPrefix", nextQuery.actionPrefix.trim());
    if (nextQuery.targetType.trim()) params.set("targetType", nextQuery.targetType.trim());

    const response = await fetch(`/api/recruitment/staff/events?${params.toString()}`, {
      credentials: "include",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to load events");
      setEventsLoading(false);
      return;
    }

    setEvents(payload.data as EventExplorerPayload);
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include",
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
        setHasSession(true);
        Promise.all([
          loadOverview(),
          loadEvents({
            search: "",
            actionPrefix: "",
            targetType: "",
            sort: "newest",
            page: 1,
            pageSize: 20,
          }),
        ]).catch(() => setError(locale === "ar" ? "تعذر تحميل البيانات." : "Unable to load data."));
      })
      .catch(() => setError(locale === "ar" ? "تعذر التحقق من الجلسة." : "Unable to verify session."))
      .finally(() => setLoading(false));

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

  }, [loadEvents, loadOverview, locale]);

  useEffect(() => {
    if (!hasSession) return;
    loadEvents(query).catch(() => setError(locale === "ar" ? "تعذر تحميل الأحداث." : "Unable to load events."));
  }, [hasSession, loadEvents, locale, query]);

  useEffect(() => {
    if (!selectedEvent) return;

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedEvent(null);
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [selectedEvent]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <PrimeCard as="section" className="p-7 md:p-10">
          <PrimePageTitle>{copy.title}</PrimePageTitle>
          <p className="mt-3 text-sm text-text-secondary">{locale === "ar" ? "جارٍ تحميل مركز التحكم..." : "Loading control center..."}</p>
        </PrimeCard>
      </main>
    );
  }

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
      setError(payload?.error?.message ?? "Failed to update request");
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
      setError(payload?.error?.message ?? "Failed to moderate message");
      return;
    }
    await loadOverview();
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
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-2 text-sm text-text-secondary md:col-span-2">
                  <span className="block">Search</span>
                  <input
                    value={query.search}
                    onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))}
                    placeholder="Action, target type, or id"
                    className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-2.5 text-text-primary"
                  />
                </label>

                <label className="space-y-2 text-sm text-text-secondary">
                  <span className="block">Action</span>
                  <select
                    value={query.actionPrefix}
                    onChange={(event) => setQuery((current) => ({ ...current, actionPrefix: event.target.value, page: 1 }))}
                    className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-2.5 text-text-primary"
                  >
                    <option value="">All actions</option>
                    <option value="recruitment.conversation">Conversation</option>
                    <option value="recruitment.conversation_request">Conversation request</option>
                    <option value="recruitment.interview">Interview</option>
                    <option value="recruitment.message">Message moderation</option>
                    <option value="recruitment.ai_supervisor">AI supervisor</option>
                    <option value="recruitment.internal_note">Internal notes</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm text-text-secondary">
                  <span className="block">Target type</span>
                  <select
                    value={query.targetType}
                    onChange={(event) => setQuery((current) => ({ ...current, targetType: event.target.value, page: 1 }))}
                    className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-2.5 text-text-primary"
                  >
                    <option value="">All targets</option>
                    <option value="recruitment_conversation_request">Conversation request</option>
                    <option value="recruitment_conversation">Conversation</option>
                    <option value="recruitment_message">Message</option>
                    <option value="recruitment_interview">Interview</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <span>Sort</span>
                  <select
                    value={query.sort}
                    onChange={(event) => {
                      const nextSort = event.target.value === "oldest" ? "oldest" : "newest";
                      setQuery((current) => ({ ...current, sort: nextSort, page: 1 }));
                    }}
                    className="rounded-xl border border-gold/15 bg-bg-secondary px-3 py-2 text-text-primary"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <select
                    value={String(query.pageSize)}
                    onChange={(event) => {
                      const nextPageSize = Number(event.target.value);
                      setQuery((current) => ({ ...current, pageSize: nextPageSize, page: 1 }));
                    }}
                    className="rounded-xl border border-gold/15 bg-bg-secondary px-3 py-2 text-text-primary"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gold/10">
                <div className="max-h-[520px] overflow-auto">
                  <table className="min-w-full divide-y divide-gold/10 text-sm">
                    <thead className="bg-bg-primary/90 text-left text-xs uppercase tracking-[0.15em] text-text-tertiary">
                      <tr>
                        <th className="px-4 py-3">Event</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/5 bg-bg-primary/60">
                      {(events?.items ?? []).map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedEvent(item)}
                          className="cursor-pointer transition hover:bg-gold/5"
                          aria-label={`Open ${item.action}`}
                        >
                          <td className="px-4 py-3 text-text-primary">
                            <p className="font-medium">{item.action}</p>
                            <p className="mt-1 text-xs text-text-tertiary">{item.id}</p>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            <p>{item.targetType}</p>
                            <p className="mt-1 text-xs text-text-tertiary">{item.targetId}</p>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            <p>{item.actor.fullName ?? item.actor.email ?? item.actor.authUserId ?? "Unknown"}</p>
                            <p className="mt-1 text-xs text-text-tertiary">{item.actor.role ?? "-"}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-text-tertiary">{formatDateTime(item.createdAt, locale)}</td>
                        </tr>
                      ))}

                      {!eventsLoading && (events?.items?.length ?? 0) === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-text-tertiary">
                            No events match these filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
                <p>
                  {(events?.pagination.totalItems ?? 0) > 0
                    ? `Showing page ${events?.pagination.page ?? 1} of ${events?.pagination.totalPages ?? 1} (${events?.pagination.totalItems ?? 0} events)`
                    : "No events available"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
                    disabled={(events?.pagination.page ?? 1) <= 1 || eventsLoading}
                    className="rounded-full border border-gold/20 px-3 py-1.5 text-xs font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      const page = events?.pagination.page ?? 1;
                      const totalPages = events?.pagination.totalPages ?? 1;
                      setQuery((current) => ({ ...current, page: Math.min(totalPages, page + 1) }));
                    }}
                    disabled={(events?.pagination.page ?? 1) >= (events?.pagination.totalPages ?? 1) || eventsLoading}
                    className="rounded-full border border-gold/20 px-3 py-1.5 text-xs font-semibold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {eventsLoading ? <p className="text-xs text-text-tertiary">Loading events...</p> : null}
            </div>
          </PrimeCard>
        </section>
      </PrimeCard>

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <aside
            className="h-full w-full max-w-[560px] overflow-y-auto border-l border-gold/20 bg-bg-primary p-6"
            onClick={(event) => event.stopPropagation()}
            aria-label="Event details"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Event details</p>
                <h3 className="mt-2 break-all font-heading text-2xl text-text-primary">{selectedEvent.action}</h3>
                <p className="mt-2 text-xs text-text-tertiary">{formatDateTime(selectedEvent.createdAt, locale)}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-full border border-gold/20 px-3 py-1 text-xs font-semibold text-text-primary"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-5 text-sm text-text-secondary">
              <PrimeCard className="p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Target</p>
                <p className="mt-2 break-all text-text-primary">{selectedEvent.targetType}</p>
                <p className="mt-1 break-all text-xs text-text-tertiary">{selectedEvent.targetId}</p>
              </PrimeCard>

              <PrimeCard className="p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Actor</p>
                <p className="mt-2 text-text-primary">{selectedEvent.actor.fullName ?? "Unknown user"}</p>
                <p className="mt-1 break-all">{selectedEvent.actor.email ?? "No email"}</p>
                <p className="mt-1">Role: {selectedEvent.actor.role ?? "-"}</p>
                <p className="mt-1 break-all text-xs text-text-tertiary">User id: {selectedEvent.actor.authUserId ?? "-"}</p>
              </PrimeCard>

              <PrimeCard className="p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Related entities</p>
                <div className="mt-3 space-y-3">
                  {(
                    [
                      ["Candidate", selectedEvent.related.candidate],
                      ["Employer", selectedEvent.related.employer],
                      ["Job", selectedEvent.related.job],
                      ["Advertisement", selectedEvent.related.advertisement],
                      ["Conversation", selectedEvent.related.conversation],
                      ["Interview", selectedEvent.related.interview],
                    ] as Array<[string, ExplorerRelatedEntity | null]>
                  ).map(([label, entity]) => (
                    <div key={label} className="rounded-xl border border-gold/10 px-3 py-2">
                      <p className="text-text-primary">{label}</p>
                      {entity ? (
                        <>
                          <p className="mt-1 break-all text-xs text-text-tertiary">{entity.id}</p>
                          <p className="mt-1">{entity.label}</p>
                          <p className="mt-1 text-xs">{entity.subtitle ?? "-"}</p>
                          {!entity.exists ? <p className="mt-1 text-xs text-amber-300">Related record no longer exists.</p> : null}
                        </>
                      ) : (
                        <p className="mt-1 text-xs text-text-tertiary">Not linked</p>
                      )}
                    </div>
                  ))}
                </div>
              </PrimeCard>

              <PrimeCard className="p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Quick actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getEventQuickActions(selectedEvent, locale).map((action) =>
                    action.disabled ? (
                      <span key={action.id} className="cursor-not-allowed rounded-full border border-gold/10 px-3 py-1.5 text-xs text-text-tertiary">
                        {action.label}
                      </span>
                    ) : (
                      <Link
                        key={action.id}
                        href={action.href}
                        className="rounded-full border border-gold/25 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10"
                      >
                        {action.label}
                      </Link>
                    )
                  )}
                  {getEventQuickActions(selectedEvent, locale).length === 0 ? (
                    <p className="text-xs text-text-tertiary">No quick actions available for this event.</p>
                  ) : null}
                </div>
              </PrimeCard>

              <PrimeCard className="p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Request context</p>
                <p className="mt-2 text-xs text-text-tertiary">IP: {selectedEvent.ipAddress ?? "-"}</p>
                <p className="mt-1 break-all text-xs text-text-tertiary">User-Agent: {selectedEvent.userAgent ?? "-"}</p>
              </PrimeCard>

              <PrimeCard className="p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-text-tertiary">Event payload (JSON)</p>
                <pre className="mt-3 overflow-auto rounded-xl bg-bg-secondary p-3 text-xs text-text-secondary">{JSON.stringify(selectedEvent.metadata, null, 2)}</pre>
              </PrimeCard>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}