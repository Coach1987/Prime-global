"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
        <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 text-sm text-text-secondary backdrop-blur-xl md:p-10">
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
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        <p className="mt-3 rounded-2xl border border-gold/25 bg-bg-primary/60 p-4 text-sm leading-7 text-text-secondary">
          {copy.conversationNotice}
        </p>

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            [copy.status, String(conversation.status ?? "-")],
            [copy.stage, String(conversation.recruitment_stage ?? "-")],
            [copy.representative, String(assignedStaff.label ?? "Prime Global")],
            [locale === "ar" ? "المرجع" : "Reference", String(candidateProfile.candidate_reference ?? employer.company_name ?? "-")],
          ].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-2 text-sm font-medium text-text-primary">{value}</p>
            </article>
          ))}
        </div>

        {permissions.canRespondToInvitation ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => respond("accept")} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
              {copy.accept}
            </button>
            <button onClick={() => respond("decline")} className="rounded-full border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-200">
              {copy.decline}
            </button>
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <div className="space-y-3">
              {data.messages.length === 0 ? <p className="text-sm text-text-tertiary">{copy.noMessages}</p> : null}
              {data.messages.map((item) => (
                <article key={String(item.id)} className="rounded-2xl border border-gold/10 bg-bg-secondary/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-tertiary">
                    <span>{String(item.sender_role ?? "message")}</span>
                    <span>{String(item.created_at ?? "")}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-text-primary">{String(item.body ?? "")}</p>
                  {String(item.moderation_state ?? "approved") !== "approved" ? (
                    <p className="mt-2 text-xs font-semibold text-gold">{copy.held}</p>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder={copy.messagePlaceholder}
                className="w-full rounded-2xl border border-gold/15 bg-bg-secondary px-4 py-3 text-sm text-text-primary"
              />
              {permissions.canSendMessages ? (
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => sendMessage(message)} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
                    {copy.send}
                  </button>
                  {role !== "staff" ? (
                    <button onClick={() => sendMessage(locale === "ar" ? "أرغب في طلب مقابلة عبر برايم جلوبال ضمن هذه المحادثة الخاضعة للإشراف." : "I would like to request an interview through Prime Global within this supervised conversation.")}
                      className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold">
                      {copy.requestInterview}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>

          <div className="space-y-6">
            {role === "staff" ? (
              <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
                <h2 className="font-heading text-2xl text-text-primary">{copy.internalNotes}</h2>
                <div className="mt-4 space-y-3">
                  {data.internalNotes.length === 0 ? <p className="text-sm text-text-tertiary">{copy.noNotes}</p> : null}
                  {data.internalNotes.map((item) => (
                    <article key={String(item.id)} className="rounded-2xl border border-gold/10 bg-bg-secondary/60 p-4 text-sm text-text-secondary">
                      <p>{String(item.note ?? "")}</p>
                      <p className="mt-2 text-xs text-text-tertiary">{String(item.created_at ?? "")}</p>
                    </article>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder={copy.notePlaceholder}
                  className="mt-4 w-full rounded-2xl border border-gold/15 bg-bg-secondary px-4 py-3 text-sm text-text-primary"
                />
                <button onClick={submitInternalNote} className="mt-3 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
                  {copy.addNote}
                </button>
              </article>
            ) : null}

            <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
              <h2 className="font-heading text-2xl text-text-primary">{copy.interviews}</h2>
              <div className="mt-4 space-y-3">
                {data.interviews.length === 0 ? <p className="text-sm text-text-tertiary">{copy.noInterviews}</p> : null}
                {data.interviews.map((item) => (
                  <article key={String(item.id)} className="rounded-2xl border border-gold/10 bg-bg-secondary/60 p-4 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">{String(item.status ?? "scheduled")}</p>
                    <p className="mt-2">{String(item.scheduled_at ?? "")}</p>
                    {role === "staff" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => updateInterview(String(item.id), "start")} className="rounded-full border border-gold/30 px-3 py-1 text-xs font-semibold text-gold">
                          {copy.startInterview}
                        </button>
                        <button onClick={() => updateInterview(String(item.id), "end")} className="rounded-full border border-gold/30 px-3 py-1 text-xs font-semibold text-gold">
                          {copy.endInterview}
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              {role === "staff" ? (
                <div className="mt-5 space-y-3">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="w-full rounded-2xl border border-gold/15 bg-bg-secondary px-4 py-3 text-sm text-text-primary"
                  />
                  <textarea
                    value={interviewNotes}
                    onChange={(event) => setInterviewNotes(event.target.value)}
                    rows={3}
                    placeholder={copy.interviewPlaceholder}
                    className="w-full rounded-2xl border border-gold/15 bg-bg-secondary px-4 py-3 text-sm text-text-primary"
                  />
                  <button onClick={scheduleInterview} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
                    {copy.scheduleInterview}
                  </button>
                </div>
              ) : null}
            </article>

            {role === "staff" ? (
              <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => updateConversation({ status: "paused", pausedReason: "staff_pause" })} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">
                    {copy.pause}
                  </button>
                  <button onClick={() => updateConversation({ status: "active" })} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">
                    {copy.reopen}
                  </button>
                  <button onClick={() => updateConversation({ status: "closed", closureReason: "staff_closed" })} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">
                    {copy.close}
                  </button>
                  <button onClick={() => updateConversation({ status: "archived" })} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">
                    {copy.archive}
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={reassignUserId}
                    onChange={(event) => setReassignUserId(event.target.value)}
                    placeholder="Prime Global staff user id"
                    className="flex-1 rounded-2xl border border-gold/15 bg-bg-secondary px-4 py-3 text-sm text-text-primary"
                  />
                  <button onClick={() => updateConversation({ assignedStaffUserId: reassignUserId || undefined, escalatedToAdmin: true })} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
                    {copy.reassign}
                  </button>
                </div>
              </article>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}