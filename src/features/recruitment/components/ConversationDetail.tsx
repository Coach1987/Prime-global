"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeInput, PrimeTextarea } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type DetailPayload = {
  conversation: Record<string, unknown>;
  participants: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  internalNotes: Array<Record<string, unknown>>;
  interviews: Array<Record<string, unknown>>;
  permissions: Record<string, boolean>;
};

function getCopy(locale: string, role: "employer" | "candidate" | "staff") {
  const isArabic = locale === "ar";
  return {
    title: isArabic ? "المحادثة الخاضعة للإشراف" : "Supervised Conversation",
    send: isArabic ? "إرسال الرسالة" : "Send message",
    requestInterview: isArabic ? "طلب مقابلة عبر برايم جلوبال" : "Request interview through Prime Global",
    openMeetingCenter: isArabic ? "فتح مركز المقابلة" : "Open Interview Center",
    internalNotes: isArabic ? "ملاحظات داخلية لبرايم جلوبال" : "Prime Global internal notes",
    addNote: isArabic ? "إضافة ملاحظة" : "Add note",
    scheduleInterview: isArabic ? "جدولة مقابلة" : "Schedule interview",
    accept: isArabic ? "قبول الدعوة" : "Accept invitation",
    decline: isArabic ? "رفض الدعوة" : "Decline invitation",
    pause: isArabic ? "إيقاف المراسلة" : "Pause messaging",
    reopen: isArabic ? "إعادة فتح المحادثة" : "Reopen conversation",
    close: isArabic ? "إغلاق المحادثة" : "Close conversation",
    archive: isArabic ? "أرشفة المحادثة" : "Archive conversation",
    startInterview: isArabic ? "بدء المقابلة" : "Start interview",
    endInterview: isArabic ? "إنهاء المقابلة" : "End interview",
    reassign: isArabic ? "إعادة التعيين" : "Reassign",
    status: isArabic ? "الحالة" : "Status",
    stage: isArabic ? "المرحلة" : "Stage",
    mode: isArabic ? "وضع الإشراف" : "Supervision mode",
    representative: isArabic ? "ممثل برايم جلوبال" : "Prime Global representative",
    interviews: isArabic ? "المقابلات" : "Interviews",
    noMessages: isArabic ? "لا توجد رسائل بعد." : "No messages yet.",
    noNotes: isArabic ? "لا توجد ملاحظات داخلية." : "No internal notes.",
    noInterviews: isArabic ? "لا توجد مقابلات مجدولة." : "No interviews scheduled.",
    held: isArabic ? "قيد المراجعة" : "Held for review",
    notePlaceholder: isArabic ? "ملاحظة داخلية للموظفين فقط" : "Staff-only internal note",
    messagePlaceholder: isArabic ? "اكتب رسالتك داخل المحادثة الخاضعة للإشراف" : "Write your message inside the supervised conversation",
    interviewPlaceholder: isArabic ? "ملاحظات المقابلة" : "Interview notes",
    conversationNotice: isArabic
      ? "تخضع هذه المحادثة لإشراف برايم جلوبال. لا يُسمح بتبادل بيانات التواصل المباشر أو نقل التواصل خارج المنصة أثناء إجراءات التوظيف."
      : "This conversation is supervised by Prime Global. Direct contact information and communication outside the platform are not permitted during the recruitment process.",
    aiAssistNotice: isArabic
      ? "مساعد برايم جلوبال الذكي يساعد مؤقتًا في هذه المحادثة. تبقى القرارات النهائية للتوظيف خاضعة لمراجعة موظف برايم جلوبال."
      : "Prime Global AI Assistant is temporarily assisting this conversation. Final recruitment decisions remain subject to Prime Global staff review.",
    activateAi: isArabic ? "تفعيل المساعدة الذكية" : "Activate AI Assist",
    awaitStaff: isArabic ? "انتظار الموظف" : "Set Awaiting Staff",
    resumeStaff: isArabic ? "استئناف إشراف الموظف" : "Resume Staff Control",
    role,
  };
}

export function ConversationDetail({
  locale,
  role,
  conversationId,
}: {
  locale: string;
  role: "employer" | "candidate" | "staff";
  conversationId: string;
}) {
  const [token, setToken] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [data, setData] = useState<DetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");
  const [reassignUserId, setReassignUserId] = useState("");
  const copy = useMemo(() => getCopy(locale, role), [locale, role]);

  const loadConversation = useCallback(async (accessToken: string) => {
    const response = await fetch(`/api/recruitment/conversations/${conversationId}?locale=${locale}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to load conversation");
      return;
    }
    setData(payload.data);
  }, [conversationId, locale]);

  const interviewCenterBasePath =
    role === "staff"
      ? `/${locale}/admin/recruitment/${conversationId}/interviews`
      : role === "candidate"
        ? `/${locale}/candidate/supervised-conversations/${conversationId}/interviews`
        : `/${locale}/employers/supervised-conversations/${conversationId}/interviews`;

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    setToken(accessToken);

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    if (!accessToken) return;
    loadConversation(accessToken).catch(() => setError(locale === "ar" ? "تعذر تحميل المحادثة." : "Unable to load conversation."));
  }, [conversationId, loadConversation, locale]);

  async function sendMessage(body: string) {
    if (!token || !body.trim()) return;

    const response = await fetch(`/api/recruitment/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ body, locale, attachments: [] }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to send message");
      return;
    }
    setMessage("");
    await loadConversation(token);
  }

  async function respond(action: "accept" | "decline") {
    if (!token) return;

    const response = await fetch(`/api/recruitment/conversations/${conversationId}/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to update invitation");
      return;
    }
    await loadConversation(token);
  }

  async function updateConversation(patch: Record<string, unknown>) {
    if (!token) return;

    const response = await fetch(`/api/recruitment/conversations/${conversationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ ...patch, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to update conversation");
      return;
    }
    await loadConversation(token);
  }

  async function submitInternalNote() {
    if (!token || !note.trim()) return;

    const response = await fetch(`/api/recruitment/conversations/${conversationId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ note }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to add note");
      return;
    }
    setNote("");
    await loadConversation(token);
  }

  async function scheduleInterview() {
    if (!token || !scheduledAt) return;

    const response = await fetch(`/api/recruitment/conversations/${conversationId}/interviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: 45,
        waitingRoomEnabled: true,
        cameraEnabled: true,
        microphoneEnabled: true,
        screenSharingEnabled: true,
        interviewNotes,
        locale,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to schedule interview");
      return;
    }
    setScheduledAt("");
    setInterviewNotes("");
    await loadConversation(token);
  }

  async function requestInterview() {
    if (!token) return;

    const response = await fetch(`/api/recruitment/conversations/${conversationId}/interviews/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to request interview");
      return;
    }

    await loadConversation(token);
  }

  async function runAiAction(action: "assist" | "set_awaiting_staff" | "set_staff_active" | "handover") {
    if (!token) return;

    const response = await fetch(`/api/recruitment/conversations/${conversationId}/ai-supervisor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ action, locale }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to execute AI supervisor action");
      return;
    }

    await loadConversation(token);
  }

  async function updateInterview(interviewId: string, hostAction: "start" | "end") {
    if (!token) return;

    const response = await fetch(`/api/recruitment/interviews/${interviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ hostAction, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to update interview");
      return;
    }
    await loadConversation(token);
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-blue-200/20 bg-[#081223]/82 p-7 text-sm text-text-secondary backdrop-blur-xl md:p-10">
          {error ?? (locale === "ar" ? "جارٍ تحميل المحادثة..." : "Loading conversation...")}
        </section>
      </main>
    );
  }

  const permissions = data.permissions ?? {};
  const conversation = data.conversation ?? {};
  const candidateProfile = (conversation.candidateProfile as Record<string, unknown> | undefined) ?? {};
  const employer = (conversation.employer as Record<string, unknown> | undefined) ?? {};
  const assignedStaff = (conversation.assignedStaff as Record<string, unknown> | undefined) ?? {};

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{copy.title}</PrimePageTitle>
        <p className="prime-auth-card mt-3 p-4 text-sm leading-7 text-text-secondary">
          {copy.conversationNotice}
        </p>
        {String(conversation.conversationMode ?? conversation.conversation_mode ?? "staff_active") !== "staff_active" ? (
          <p className="prime-auth-card mt-3 p-4 text-sm leading-7 text-blue-200">
            {copy.aiAssistNotice}
          </p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            [copy.status, String(conversation.status ?? "-")],
            [copy.stage, String(conversation.recruitment_stage ?? "-")],
            [copy.mode, String(conversation.conversationMode ?? conversation.conversation_mode ?? "staff_active")],
            [copy.representative, String(assignedStaff.label ?? "Prime Global")],
            [locale === "ar" ? "المرجع" : "Reference", String(candidateProfile.candidate_reference ?? employer.company_name ?? "-")],
          ].map(([label, value]) => (
            <PrimeCard key={String(label)} className="p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-2 text-sm font-medium text-text-primary">{value}</p>
            </PrimeCard>
          ))}
        </div>

        {permissions.canRespondToInvitation ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => respond("accept")} className={primeButtonClasses("primary")}>
              {copy.accept}
            </button>
            <button onClick={() => respond("decline")} className="rounded-full border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-200">
              {copy.decline}
            </button>
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <PrimeCard className="p-5">
            <div className="space-y-3">
              {data.messages.length === 0 ? <p className="text-sm text-text-tertiary">{copy.noMessages}</p> : null}
              {data.messages.map((item) => (
                <PrimeCard key={String(item.id)} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-tertiary">
                    <span>{String(item.sender_role ?? "message")}</span>
                    <span>{String(item.created_at ?? "")}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-text-primary">{String(item.body ?? "")}</p>
                  {String(item.moderation_state ?? "approved") !== "approved" ? (
                    <p className="mt-2 text-xs font-semibold text-blue-200">{copy.held}</p>
                  ) : null}
                </PrimeCard>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <PrimeTextarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder={copy.messagePlaceholder}
              />
              {permissions.canSendMessages ? (
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => sendMessage(message)} className={primeButtonClasses("primary")}>
                    {copy.send}
                  </button>
                  {role === "employer" && permissions.canRequestInterview ? (
                    <button
                      onClick={requestInterview}
                      className={primeButtonClasses("secondary")}>
                      {copy.requestInterview}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </PrimeCard>

          <div className="space-y-6">
            {role === "staff" ? (
              <PrimeCard className="p-5">
                <h2 className="font-heading text-2xl text-text-primary">{copy.internalNotes}</h2>
                <div className="mt-4 space-y-3">
                  {data.internalNotes.length === 0 ? <p className="text-sm text-text-tertiary">{copy.noNotes}</p> : null}
                  {data.internalNotes.map((item) => (
                    <PrimeCard key={String(item.id)} className="p-4 text-sm text-text-secondary">
                      <p>{String(item.note ?? "")}</p>
                      <p className="mt-2 text-xs text-text-tertiary">{String(item.created_at ?? "")}</p>
                    </PrimeCard>
                  ))}
                </div>
                <PrimeTextarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder={copy.notePlaceholder}
                  className="mt-4"
                />
                <button onClick={submitInternalNote} className={`${primeButtonClasses("primary")} mt-3`}>
                  {copy.addNote}
                </button>
              </PrimeCard>
            ) : null}

            <PrimeCard className="p-5">
              <h2 className="font-heading text-2xl text-text-primary">{copy.interviews}</h2>
              <div className="mt-4 space-y-3">
                {data.interviews.length === 0 ? <p className="text-sm text-text-tertiary">{copy.noInterviews}</p> : null}
                {data.interviews.map((item) => (
                  <PrimeCard key={String(item.id)} className="p-4 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">{String(item.status ?? "scheduled")}</p>
                    <p className="mt-2">{String(item.scheduled_at ?? "")}</p>
                    <a
                      href={`${interviewCenterBasePath}/${String(item.id)}`}
                      className={`${primeButtonClasses("secondary", "sm")} mt-3`}
                    >
                      {copy.openMeetingCenter}
                    </a>
                    {role === "staff" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => updateInterview(String(item.id), "start")} className={primeButtonClasses("secondary", "sm")}>
                          {copy.startInterview}
                        </button>
                        <button onClick={() => updateInterview(String(item.id), "end")} className={primeButtonClasses("secondary", "sm")}>
                          {copy.endInterview}
                        </button>
                      </div>
                    ) : null}
                  </PrimeCard>
                ))}
              </div>

              {role === "staff" ? (
                <div className="mt-5 space-y-3">
                  <PrimeInput
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                  <PrimeTextarea
                    value={interviewNotes}
                    onChange={(event) => setInterviewNotes(event.target.value)}
                    rows={3}
                    placeholder={copy.interviewPlaceholder}
                  />
                  <button onClick={scheduleInterview} className={primeButtonClasses("primary")}>
                    {copy.scheduleInterview}
                  </button>
                </div>
              ) : null}
            </PrimeCard>

            {role === "staff" ? (
              <PrimeCard className="p-5">
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => updateConversation({ status: "paused", pausedReason: "staff_pause" })} className={primeButtonClasses("secondary", "sm")}>
                    {copy.pause}
                  </button>
                  <button onClick={() => updateConversation({ status: "active" })} className={primeButtonClasses("secondary", "sm")}>
                    {copy.reopen}
                  </button>
                  <button onClick={() => updateConversation({ status: "closed", closureReason: "staff_closed" })} className={primeButtonClasses("secondary", "sm")}>
                    {copy.close}
                  </button>
                  <button onClick={() => updateConversation({ status: "archived" })} className={primeButtonClasses("secondary", "sm")}>
                    {copy.archive}
                  </button>
                  <button onClick={() => runAiAction("assist")} className={primeButtonClasses("secondary", "sm")}>
                    {copy.activateAi}
                  </button>
                  <button onClick={() => runAiAction("set_awaiting_staff")} className={primeButtonClasses("secondary", "sm")}>
                    {copy.awaitStaff}
                  </button>
                  <button onClick={() => runAiAction("set_staff_active")} className={primeButtonClasses("secondary", "sm")}>
                    {copy.resumeStaff}
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <PrimeInput
                    value={reassignUserId}
                    onChange={(event) => setReassignUserId(event.target.value)}
                    placeholder="Prime Global staff user id"
                    className="flex-1"
                  />
                  <button onClick={() => updateConversation({ assignedStaffUserId: reassignUserId || undefined, escalatedToAdmin: true })} className={primeButtonClasses("primary")}>
                    {copy.reassign}
                  </button>
                </div>
              </PrimeCard>
            ) : null}
          </div>
        </section>
      </PrimeCard>
    </main>
  );
}