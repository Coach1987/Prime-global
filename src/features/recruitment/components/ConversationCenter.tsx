"use client";

import { useEffect, useMemo, useState } from "react";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type ConversationRow = Record<string, unknown>;

function getCopy(locale: string, role: "employer" | "candidate") {
  const isArabic = locale === "ar";

  return {
    title:
      role === "employer"
        ? isArabic
          ? "مركز المقابلات"
          : "Interview Center"
        : isArabic
          ? "مقابلاتي"
          : "My Interviews",
    subtitle:
      role === "employer"
        ? isArabic
          ? "اطلب التواصل المهني مع المرشحين الموافق عليهم، وتابع كل محادثة تحت إشراف برايم جلوبال."
          : "Request professional contact with approved candidates and manage every conversation under Prime Global supervision."
        : isArabic
          ? "اقبل أو ارفض الدعوات، وشارك في محادثات التوظيف داخل المنصة فقط."
          : "Accept or decline invitations and participate in recruitment conversations only inside the platform.",
    notice: isArabic
      ? "تخضع هذه المحادثة لإشراف برايم جلوبال. لا يُسمح بتبادل بيانات التواصل المباشر أو نقل التواصل خارج المنصة أثناء إجراءات التوظيف."
      : "This conversation is supervised by Prime Global. Direct contact information and communication outside the platform are not permitted during the recruitment process.",
    requests: isArabic ? "الطلبات" : "Requests",
    conversations: isArabic ? "المحادثات" : "Conversations",
    open: isArabic ? "فتح المحادثة" : "Open conversation",
    emptyRequests: isArabic ? "لا توجد طلبات حالية." : "No current requests.",
    emptyConversations: isArabic ? "لا توجد محادثات نشطة أو معلقة." : "No active or pending conversations.",
    assignedStaff: isArabic ? "ممثل برايم جلوبال" : "Prime Global representative",
    candidate: isArabic ? "المرشح" : "Candidate",
    employer: isArabic ? "صاحب العمل" : "Employer",
    status: isArabic ? "الحالة" : "Status",
    stage: isArabic ? "المرحلة" : "Stage",
    interviewInvites: isArabic ? "دعوات المقابلات" : "Interview invitations",
    nextInterview: isArabic ? "الموعد القادم" : "Next interview",
    unread: isArabic ? "غير مقروء" : "Unread",
    roles: isArabic ? "الأدوار" : "Participant roles",
    recruiterPresence: isArabic ? "حضور الممثل" : "Recruiter presence",
    lastMessage: isArabic ? "آخر رسالة" : "Last message",
  };
}

export function ConversationCenter({
  locale,
  role,
  detailBasePath,
}: {
  locale: string;
  role: "employer" | "candidate";
  detailBasePath: string;
}) {
  const [token, setToken] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [requests, setRequests] = useState<ConversationRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const copy = useMemo(() => getCopy(locale, role), [locale, role]);

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
        if ((role === "candidate" && currentRole !== "candidate") || (role === "employer" && currentRole !== "employer")) {
          setError(locale === "ar" ? "صلاحيات غير كافية." : "Insufficient role privileges.");
          return;
        }
        setIsAuthorized(true);
      })
      .catch(() => setError(locale === "ar" ? "تعذر التحقق من الجلسة." : "Unable to verify session."));
  }, [locale, role]);

  useEffect(() => {
    if (!token || !isAuthorized) return;

    Promise.all([
      fetch(`/api/recruitment/conversation-requests?locale=${locale}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/recruitment/conversations?locale=${locale}`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([requestsResponse, conversationsResponse]) => {
        const [requestsPayload, conversationsPayload] = await Promise.all([requestsResponse.json(), conversationsResponse.json()]);

        if (!requestsResponse.ok || !conversationsResponse.ok) {
          setError(requestsPayload?.error?.message ?? conversationsPayload?.error?.message ?? "Failed to load");
          return;
        }

        setRequests(requestsPayload?.data ?? []);
        setConversations(conversationsPayload?.data ?? []);
      })
      .catch(() => setError(locale === "ar" ? "تعذر تحميل البيانات." : "Unable to load data."));
  }, [locale, token, isAuthorized]);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{copy.title}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{copy.subtitle}</p>
        <div className="prime-auth-card mt-6 p-5 text-sm leading-7 text-text-secondary">
          {copy.notice}
        </div>

        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">{copy.requests}</h2>
            <div className="mt-4 space-y-3">
              {requests.length === 0 ? <p className="text-sm text-text-tertiary">{copy.emptyRequests}</p> : null}
              {requests.map((request) => (
                <PrimeCard key={String(request.id)} className="p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{copy.status}</p>
                  <p className="mt-1 text-sm font-medium text-text-primary">{String(request.status ?? "-")}</p>
                  <p className="mt-3 text-sm text-text-secondary">
                    {copy.candidate}: {String((request.candidateProfile as Record<string, unknown> | undefined)?.candidate_reference ?? "PG Candidate")}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">{copy.assignedStaff}: {String((request.assignedStaff as Record<string, unknown> | undefined)?.label ?? "Prime Global")}</p>
                </PrimeCard>
              ))}
            </div>
          </PrimeCard>

          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">{copy.conversations}</h2>
            <div className="mt-4 space-y-3">
              {conversations.length === 0 ? <p className="text-sm text-text-tertiary">{copy.emptyConversations}</p> : null}
              {conversations.map((conversation) => (
                <PrimeCard key={String(conversation.id)} className="p-4">
                  <p className="text-sm font-medium text-text-primary">
                    {role === "employer"
                      ? String((conversation.candidateProfile as Record<string, unknown> | undefined)?.candidate_reference ?? "PG Candidate")
                      : String((conversation.employer as Record<string, unknown> | undefined)?.company_name ?? "Prime Global Employer")}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                    <p>{copy.status}: {String(conversation.status ?? "-")}</p>
                    <p>{copy.stage}: {String(conversation.recruitment_stage ?? "-")}</p>
                    <p>{copy.assignedStaff}: {String((conversation.assignedStaff as Record<string, unknown> | undefined)?.label ?? "Prime Global")}</p>
                    <p>{copy.employer}: {String((conversation.employer as Record<string, unknown> | undefined)?.company_name ?? "-")}</p>
                    <p>
                      {copy.interviewInvites}: {String((conversation.interviewSummary as Record<string, unknown> | undefined)?.pendingInvitations ?? 0)}
                    </p>
                    <p>
                      {copy.nextInterview}: {String((conversation.interviewSummary as Record<string, unknown> | undefined)?.nextInterviewAt ?? "-")}
                    </p>
                    <p>
                      {copy.unread}: {String(((conversation.unread as Record<string, unknown> | undefined)?.unreadCount ?? 0))}
                    </p>
                    <p>
                      {copy.recruiterPresence}: {String(conversation.recruiterPresence ?? "offline")}
                    </p>
                    <p>
                      {copy.roles}: {Array.isArray(conversation.participantRoles) ? conversation.participantRoles.join(", ") : "-"}
                    </p>
                    <p>
                      {copy.lastMessage}: {String(conversation.lastMessageAt ?? "-")}
                    </p>
                  </div>
                  <a href={`${detailBasePath}/${String(conversation.id)}`} className={`${primeButtonClasses("secondary", "sm")} mt-4`}>
                    {copy.open}
                  </a>
                </PrimeCard>
              ))}
            </div>
          </PrimeCard>
        </section>
      </PrimeCard>
    </main>
  );
}