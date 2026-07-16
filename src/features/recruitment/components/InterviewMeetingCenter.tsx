"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type MeetingCenterPayload = {
  interview: Record<string, unknown>;
  conversationId: string;
  meetingCenter: Record<string, unknown>;
  permissions: Record<string, boolean>;
  participants: Array<Record<string, unknown>>;
  chatMessages: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
};

function getCopy(locale: string) {
  const isArabic = locale === "ar";
  return {
    title: isArabic ? "مركز المقابلات" : "Interview Center",
    secureNotice: isArabic
      ? "تتم المقابلة داخل منصة برايم جلوبال فقط. يمنع مشاركة بيانات التواصل المباشر أو الروابط الخارجية."
      : "Interview is conducted only inside Prime Global. Direct contacts and external links are blocked.",
    join: isArabic ? "الانضمام إلى المقابلة" : "Join meeting",
    leave: isArabic ? "مغادرة المقابلة" : "Leave meeting",
    start: isArabic ? "بدء المقابلة" : "Start meeting",
    end: isArabic ? "إنهاء المقابلة" : "End meeting",
    chat: isArabic ? "دردشة المقابلة" : "Meeting chat",
    participants: isArabic ? "المشاركون" : "Participants",
    history: isArabic ? "سجل المقابلة" : "Interview history",
    timer: isArabic ? "مؤقت المقابلة" : "Meeting timer",
    camera: isArabic ? "الكاميرا" : "Camera",
    mic: isArabic ? "المايكروفون" : "Microphone",
    share: isArabic ? "مشاركة الشاشة" : "Screen sharing",
    placeholder: isArabic ? "واجهة الفيديو التجريبية داخل برايم جلوبال" : "In-platform video interface placeholder",
    send: isArabic ? "إرسال" : "Send",
    chatPlaceholder: isArabic ? "اكتب رسالة المقابلة هنا" : "Type interview chat message",
    noChat: isArabic ? "لا توجد رسائل بعد." : "No chat messages yet.",
  };
}

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

export function InterviewMeetingCenter({
  locale,
  role,
  interviewId,
}: {
  locale: string;
  role: "employer" | "candidate" | "staff";
  interviewId: string;
}) {
  const [token, setToken] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [data, setData] = useState<MeetingCenterPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatBody, setChatBody] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharingOn, setScreenSharingOn] = useState(false);
  const copy = useMemo(() => getCopy(locale), [locale]);

  const loadCenter = useCallback(async (accessToken: string) => {
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center?locale=${locale}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to load meeting center");
      return;
    }
    setData(payload.data);
  }, [interviewId, locale]);

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    setToken(accessToken);

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    if (!accessToken) return;
    loadCenter(accessToken).catch(() => setError(locale === "ar" ? "تعذر تحميل المركز." : "Unable to load center."));
  }, [interviewId, locale, loadCenter]);

  useEffect(() => {
    if (!token) return;
    const id = window.setInterval(() => {
      loadCenter(token).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [token, loadCenter]);

  useEffect(() => {
    if (!data?.interview) return;
    setCameraOn(Boolean(data.interview.camera_enabled));
    setMicOn(Boolean(data.interview.microphone_enabled));
    setScreenSharingOn(Boolean(data.interview.screen_sharing_enabled));
  }, [data]);

  async function joinMeeting() {
    if (!token) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "x-csrf-token": csrfToken },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to join meeting");
      return;
    }
    await loadCenter(token);
  }

  async function leaveMeeting() {
    if (!token) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "x-csrf-token": csrfToken },
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to leave meeting");
      return;
    }
    await loadCenter(token);
  }

  async function sendChat() {
    if (!token || !chatBody.trim()) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ body: chatBody, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to send chat message");
      return;
    }
    setChatBody("");
    await loadCenter(token);
  }

  async function startOrEndMeeting(hostAction: "start" | "end") {
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
    await loadCenter(token);
  }

  const timerValue = useMemo(() => {
    if (!data?.interview?.host_started_at) return "00:00:00";
    const started = new Date(String(data.interview.host_started_at)).getTime();
    const endedRaw = data.interview.host_ended_at ? new Date(String(data.interview.host_ended_at)).getTime() : Date.now();
    if (!Number.isFinite(started) || !Number.isFinite(endedRaw) || endedRaw < started) return "00:00:00";
    return formatDuration((endedRaw - started) / 1000);
  }, [data]);

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 text-sm text-text-secondary backdrop-blur-xl md:p-10">
          {error ?? (locale === "ar" ? "جارٍ تحميل مركز المقابلات..." : "Loading interview center...")}
        </section>
      </main>
    );
  }

  const permissions = data.permissions ?? {};

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        <p className="mt-3 rounded-2xl border border-gold/25 bg-bg-primary/60 p-4 text-sm leading-7 text-text-secondary">{copy.secureNotice}</p>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.8fr_1fr]">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{copy.placeholder}</p>
            <div className="mt-4 min-h-[280px] rounded-2xl border border-gold/15 bg-bg-secondary/70 p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                <button onClick={() => setCameraOn((v) => !v)} className="rounded-full border border-gold/30 px-4 py-2 text-xs font-semibold text-gold">
                  {copy.camera}: {cameraOn ? "on" : "off"}
                </button>
                <button onClick={() => setMicOn((v) => !v)} className="rounded-full border border-gold/30 px-4 py-2 text-xs font-semibold text-gold">
                  {copy.mic}: {micOn ? "on" : "off"}
                </button>
                <button onClick={() => setScreenSharingOn((v) => !v)} className="rounded-full border border-gold/30 px-4 py-2 text-xs font-semibold text-gold">
                  {copy.share}: {screenSharingOn ? "on" : "off"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.participants ?? []).map((participant) => (
                  <article key={String(participant.id)} className="rounded-xl border border-gold/10 bg-bg-primary/70 p-3 text-sm text-text-primary">
                    <p className="font-medium">{String(participant.participant_role ?? "participant")}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{String(participant.presence_status ?? "invited")}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {permissions.canJoinMeeting ? (
                <button onClick={joinMeeting} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
                  {copy.join}
                </button>
              ) : null}
              {permissions.canJoinMeeting ? (
                <button onClick={leaveMeeting} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold">
                  {copy.leave}
                </button>
              ) : null}
              {role === "staff" && permissions.canStartOrEndMeeting ? (
                <>
                  <button onClick={() => startOrEndMeeting("start")} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold">
                    {copy.start}
                  </button>
                  <button onClick={() => startOrEndMeeting("end")} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold">
                    {copy.end}
                  </button>
                </>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-gold/20 px-4 py-2 text-xs font-semibold text-text-secondary">
                {copy.timer}: {timerValue}
              </span>
            </div>
          </article>

          <article className="space-y-5">
            <section className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
              <h2 className="font-heading text-2xl text-text-primary">{copy.chat}</h2>
              <div className="mt-4 max-h-[240px] space-y-2 overflow-y-auto">
                {(data.chatMessages ?? []).length === 0 ? <p className="text-sm text-text-tertiary">{copy.noChat}</p> : null}
                {(data.chatMessages ?? []).map((item) => (
                  <article key={String(item.id)} className="rounded-xl border border-gold/10 bg-bg-secondary/60 p-3 text-sm">
                    <p className="text-xs text-text-tertiary">{String(item.sender_role ?? "participant")}</p>
                    <p className="mt-1 text-text-primary">{String(item.body ?? "")}</p>
                  </article>
                ))}
              </div>
              {permissions.canSendChat ? (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={chatBody}
                    onChange={(event) => setChatBody(event.target.value)}
                    rows={3}
                    placeholder={copy.chatPlaceholder}
                    className="w-full rounded-2xl border border-gold/15 bg-bg-secondary px-4 py-3 text-sm text-text-primary"
                  />
                  <button onClick={sendChat} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
                    {copy.send}
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
              <h2 className="font-heading text-2xl text-text-primary">{copy.history}</h2>
              <div className="mt-4 max-h-[200px] space-y-2 overflow-y-auto">
                {(data.history ?? []).map((event) => (
                  <article key={String(event.id)} className="rounded-xl border border-gold/10 bg-bg-secondary/60 p-3 text-xs text-text-secondary">
                    <p className="font-medium text-text-primary">{String(event.event_type ?? "event")}</p>
                    <p className="mt-1">{String(event.created_at ?? "")}</p>
                  </article>
                ))}
              </div>
            </section>
          </article>
        </section>
      </section>
    </main>
  );
}
