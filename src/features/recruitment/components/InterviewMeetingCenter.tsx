"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createJitsiVideoTransport, type JitsiVideoTransport, type MediaDeviceOption } from "@/features/recruitment/utils/jitsi-video-transport";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeInput, PrimeTextarea } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

type MeetingCenterPayload = {
  interview: Record<string, unknown>;
  conversationId: string;
  meetingCenter: Record<string, unknown>;
  permissions: Record<string, boolean>;
  latestCoordinationTermsVersion?: string;
  invitationState?: Record<string, unknown>;
  coordinationTerms?: Record<string, unknown>;
  readiness?: Record<string, unknown>;
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
    liveRoom: isArabic ? "غرفة مقابلة مباشرة ومؤمنة" : "Secure live interview room",
    send: isArabic ? "إرسال" : "Send",
    acceptInterview: isArabic ? "قبول الدعوة" : "Accept invitation",
    rejectInterview: isArabic ? "رفض الدعوة" : "Reject invitation",
    acceptTerms: isArabic ? "الموافقة على شروط التنسيق" : "Accept coordination terms",
    ready: isArabic ? "أنا جاهز" : "I am ready",
    notReady: isArabic ? "لست جاهزًا بعد" : "Not ready yet",
    waitingRoom: isArabic ? "غرفة الانتظار" : "Waiting room",
    tokenIssued: isArabic ? "تم إنشاء رمز انضمام قصير العمر. سيتم استخدامه مرة واحدة فقط." : "A short-lived join token was issued and used once.",
    coordinationBanner: isArabic ? "تُنسَّق هذه المقابلة حصريًا من خلال برايم جلوبال." : "This interview is coordinated exclusively by Prime Global.",
    chatPlaceholder: isArabic ? "اكتب رسالة المقابلة هنا" : "Type interview chat message",
    noChat: isArabic ? "لا توجد رسائل بعد." : "No chat messages yet.",
    connectionQuality: isArabic ? "جودة الاتصال" : "Connection quality",
    audioInput: isArabic ? "مصدر المايكروفون" : "Microphone input",
    videoInput: isArabic ? "مصدر الكاميرا" : "Camera input",
    enableLobby: isArabic ? "فعل غرفة الانتظار من إعدادات الاجتماع" : "Enable waiting room from meeting settings",
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
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [data, setData] = useState<MeetingCenterPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatBody, setChatBody] = useState("");
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharingOn, setScreenSharingOn] = useState(false);
  const [tokenNotice, setTokenNotice] = useState<string | null>(null);
  const [deviceCheckResult, setDeviceCheckResult] = useState<{ cameraReady: boolean; microphoneReady: boolean; checkedAt: string } | null>(null);
  const [identity, setIdentity] = useState<{ userId: string; displayName: string } | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<number | null>(null);
  const [transportReady, setTransportReady] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceOption[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedVideoInput, setSelectedVideoInput] = useState("");
  const copy = useMemo(() => getCopy(locale), [locale]);
  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const transportRef = useRef<JitsiVideoTransport | null>(null);

  const loadCenter = useCallback(async () => {
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center?locale=${locale}`, {
      credentials: "include",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to load meeting center");
      return;
    }
    setData(payload.data);
  }, [interviewId, locale]);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me", {
        credentials: "include",
      }),
      fetch("/api/security/csrf"),
    ])
      .then(async ([authResponse, csrfResponse]) => {
        const [authPayload, csrfPayload] = await Promise.all([authResponse.json(), csrfResponse.json()]);

        if (!authPayload?.success) {
          setError(locale === "ar" ? "فشل التحقق من الجلسة." : "Session verification failed.");
          return;
        }

        const userRole = String(authPayload?.data?.role ?? "");
        const roleAllowed =
          (role === "candidate" && userRole === "candidate") ||
          (role === "employer" && userRole === "employer") ||
          (role === "staff" && (userRole === "prime_global_recruiter" || userRole === "prime_global_admin" || userRole === "admin" || userRole === "super_admin"));

        if (!roleAllowed) {
          setError(locale === "ar" ? "صلاحيات غير كافية." : "Insufficient role privileges.");
          return;
        }

        const displayName = String(authPayload?.data?.displayName ?? "").trim();
        const fallbackName = role === "staff" ? "Prime Global Staff" : role === "candidate" ? "Candidate" : "Employer";
        setIdentity({
          userId: String(authPayload?.data?.userId ?? ""),
          displayName: displayName || fallbackName,
        });

        setHasSession(true);
        setIsAuthorized(true);
        setCsrfToken(csrfPayload?.data?.csrfToken ?? "");
        await loadCenter();
      })
      .catch(() => setError(locale === "ar" ? "تعذر تحميل المركز." : "Unable to load center."))
      .finally(() => setLoading(false));
  }, [interviewId, locale, role, loadCenter]);

  useEffect(() => {
    if (!hasSession || !isAuthorized) return;
    const id = window.setInterval(() => {
      loadCenter().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(id);
  }, [hasSession, isAuthorized, loadCenter]);

  useEffect(() => {
    if (!data?.interview) return;
    setCameraOn(Boolean(data.interview.camera_enabled));
    setMicOn(Boolean(data.interview.microphone_enabled));
    setScreenSharingOn(Boolean(data.interview.screen_sharing_enabled));
  }, [data]);

  const initializeLiveRoom = useCallback(async () => {
    if (!jitsiContainerRef.current || !data?.interview || !identity) return;

    try {
      const roomName = String(data.interview.meeting_room_reference ?? `pg-room-${interviewId}`);
      const transport = createJitsiVideoTransport();
      transportRef.current?.destroy();
      transportRef.current = transport;

      transport.onConnectionQualityChange((value) => setConnectionQuality(value));

      await transport.initialize({
        container: jitsiContainerRef.current,
        roomName,
        locale: locale === "ar" ? "ar" : "en",
        identity: {
          displayName: identity.displayName,
        },
        startWithAudioMuted: !micOn,
        startWithVideoMuted: !cameraOn,
      });

      const devices = await transport.listDevices();
      const audio = devices.filter((device) => device.kind === "audioinput");
      const video = devices.filter((device) => device.kind === "videoinput");

      setAudioInputs(audio);
      setVideoInputs(video);
      setSelectedAudioInput((current) => current || audio[0]?.deviceId || "");
      setSelectedVideoInput((current) => current || video[0]?.deviceId || "");
      setConnectionQuality(transport.getConnectionQuality());
      setTransportReady(true);
      window.localStorage.setItem(`pg:interview:${interviewId}:transport`, "active");
    } catch {
      setTransportReady(false);
      setError(locale === "ar" ? "تعذر تهيئة غرفة المقابلة المباشرة." : "Unable to initialize live interview room.");
    }
  }, [cameraOn, data, identity, interviewId, locale, micOn]);

  const destroyLiveRoom = useCallback(() => {
    transportRef.current?.destroy();
    transportRef.current = null;
    setTransportReady(false);
    setConnectionQuality(null);
    window.localStorage.removeItem(`pg:interview:${interviewId}:transport`);
  }, [interviewId]);

  useEffect(() => {
    return () => {
      transportRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!data?.participants || !data.interview) return;

    const status = String(data.interview.status ?? "scheduled");
    if (status !== "live" && transportReady) {
      destroyLiveRoom();
      return;
    }

    const persisted = window.localStorage.getItem(`pg:interview:${interviewId}:transport`) === "active";
    const roleKey = role === "staff" ? "prime_global_staff" : role;
    const joined = (data.participants ?? []).some((participant) => {
      return String(participant.participant_role ?? "") === roleKey && String(participant.presence_status ?? "") === "joined";
    });

    if ((joined || persisted) && !transportReady) {
      initializeLiveRoom().catch(() => undefined);
    }
  }, [data, destroyLiveRoom, initializeLiveRoom, interviewId, role, transportReady]);

  async function joinMeeting() {
    if (!hasSession) return;

    const tokenResponse = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/token`, {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
    });
    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenPayload.success) {
      setError(tokenPayload?.error?.message ?? "Failed to issue join token");
      return;
    }

    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ joinToken: tokenPayload?.data?.token }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to join meeting");
      return;
    }
    setTokenNotice(copy.tokenIssued);
    await loadCenter();
    await initializeLiveRoom();
  }

  async function respondToInvitation(action: "accept" | "reject") {
    if (!hasSession) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/invitation/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ action, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to update invitation");
      return;
    }
    await loadCenter();
  }

  async function acceptCoordinationTerms() {
    if (!hasSession) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/coordination-terms/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to accept terms");
      return;
    }
    await loadCenter();
  }

  async function setReadiness(ready: boolean) {
    if (!hasSession) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/readiness`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ ready }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to update readiness");
      return;
    }
    await loadCenter();
  }

  async function runDeviceCheck() {
    const transport = transportRef.current;
    if (!transport) {
      setError(locale === "ar" ? "انضم إلى غرفة الاجتماع أولًا." : "Join the meeting room first.");
      return;
    }

    const result = await transport.runDeviceCheck({
      cameraEnabled: cameraOn,
      microphoneEnabled: micOn,
    });
    setDeviceCheckResult(result);
  }

  async function leaveMeeting() {
    if (!hasSession) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/leave`, {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to leave meeting");
      return;
    }
    destroyLiveRoom();
    await loadCenter();
  }

  async function sendChat() {
    if (!hasSession || !chatBody.trim()) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}/meeting-center/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ body: chatBody, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to send chat message");
      return;
    }
    setChatBody("");
    await loadCenter();
  }

  async function startOrEndMeeting(hostAction: "start" | "end") {
    if (!hasSession) return;
    const response = await fetch(`/api/recruitment/interviews/${interviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({ hostAction, locale }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Failed to update interview");
      return;
    }
    await loadCenter();
  }

  async function updateScheduleOrStatus(input: { status?: "cancelled"; scheduledAt?: string }) {
    if (!hasSession) return;
    const payload: Record<string, unknown> = { locale };
    if (input.status) payload.status = input.status;
    if (input.scheduledAt) payload.scheduledAt = new Date(input.scheduledAt).toISOString();

    const response = await fetch(`/api/recruitment/interviews/${interviewId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "Failed to update interview schedule");
      return;
    }
    setRescheduleAt("");
    await loadCenter();
  }

  const timerValue = useMemo(() => {
    if (!data?.interview?.host_started_at) return "00:00:00";
    const started = new Date(String(data.interview.host_started_at)).getTime();
    const endedRaw = data.interview.host_ended_at ? new Date(String(data.interview.host_ended_at)).getTime() : Date.now();
    if (!Number.isFinite(started) || !Number.isFinite(endedRaw) || endedRaw < started) return "00:00:00";
    return formatDuration((endedRaw - started) / 1000);
  }, [data]);

  if (loading || !hasSession || !isAuthorized || !data) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-blue-200/20 bg-[#081223]/82 p-7 text-sm text-text-secondary backdrop-blur-xl md:p-10">
          {error ?? (locale === "ar" ? "جارٍ تحميل مركز المقابلات..." : "Loading interview center...")}
        </section>
      </main>
    );
  }

  const permissions = data.permissions ?? {};
  const schedule = String(data.interview?.scheduled_at ?? "-");
  const invitationState = data.invitationState ?? {};
  const termsState = data.coordinationTerms ?? {};

  const workflowSteps = [
    { id: "invitation", label: "Invitation", done: Boolean(invitationState.candidateAccepted) && Boolean(invitationState.employerAccepted) },
    { id: "schedule", label: "Schedule", done: Boolean(data.interview?.scheduled_at) },
    { id: "waiting-room", label: "Waiting Room", done: String(data.interview?.status ?? "") === "waiting" || String(data.interview?.status ?? "") === "live" },
    { id: "device-check", label: "Camera/Microphone Check", done: Boolean(deviceCheckResult?.cameraReady) && Boolean(deviceCheckResult?.microphoneReady) },
    { id: "join", label: "Join Meeting", done: String(data.interview?.status ?? "") === "live" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{copy.title}</PrimePageTitle>
        <p className="prime-auth-card mt-3 p-4 text-sm leading-7 text-text-secondary">{copy.secureNotice}</p>
        <p className="prime-auth-card mt-3 p-4 text-sm leading-7 text-text-secondary">{String(data.coordinationTerms?.notice ?? copy.coordinationBanner)}</p>
        {tokenNotice ? <p className="mt-3 text-xs text-blue-200">{tokenNotice}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <section className="prime-auth-card mt-5 p-4 text-sm text-text-secondary">
          <p>{copy.waitingRoom}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {role !== "staff" ? (
              <>
                <button onClick={() => respondToInvitation("accept")} className={primeButtonClasses("secondary", "sm")}>{copy.acceptInterview}</button>
                <button onClick={() => respondToInvitation("reject")} className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-200">{copy.rejectInterview}</button>
                <button onClick={acceptCoordinationTerms} className={primeButtonClasses("secondary", "sm")}>{copy.acceptTerms}</button>
                <button onClick={() => setReadiness(true)} className={primeButtonClasses("secondary", "sm")}>{copy.ready}</button>
                <button onClick={() => setReadiness(false)} className={primeButtonClasses("secondary", "sm")}>{copy.notReady}</button>
              </>
            ) : null}
          </div>
        </section>

        <section className="prime-auth-card mt-5 p-4">
          <p className="text-sm font-semibold text-text-primary">Interview Workflow</p>
          <p className="mt-2 text-xs text-text-secondary">Scheduled at: {schedule}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {workflowSteps.map((step) => (
              <PrimeCard key={step.id} className="rounded-xl p-3 text-xs">
                <p className="font-semibold text-text-primary">{step.label}</p>
                <p className="mt-1 text-text-secondary">{step.done ? "complete" : "pending"}</p>
              </PrimeCard>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Terms accepted: candidate {String(Boolean(termsState.candidateAcceptedLatest))} / employer {String(Boolean(termsState.employerAcceptedLatest))}
          </p>
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[1.8fr_1fr]">
          <PrimeCard className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{copy.liveRoom}</p>
            <div className="prime-auth-card mt-4 min-h-[280px] p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    transportRef.current?.toggleVideo();
                    setCameraOn((v) => !v);
                  }}
                  className={primeButtonClasses("secondary", "sm")}
                >
                  {copy.camera}: {cameraOn ? "on" : "off"}
                </button>
                <button
                  onClick={() => {
                    transportRef.current?.toggleAudio();
                    setMicOn((v) => !v);
                  }}
                  className={primeButtonClasses("secondary", "sm")}
                >
                  {copy.mic}: {micOn ? "on" : "off"}
                </button>
                <button
                  onClick={() => {
                    transportRef.current?.toggleScreenShare();
                    setScreenSharingOn((v) => !v);
                  }}
                  className={primeButtonClasses("secondary", "sm")}
                >
                  {copy.share}: {screenSharingOn ? "on" : "off"}
                </button>
                <button onClick={runDeviceCheck} className={primeButtonClasses("secondary", "sm")}>
                  Camera/Microphone check
                </button>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-text-secondary">
                  {copy.audioInput}
                  <select
                    value={selectedAudioInput}
                    onChange={async (event) => {
                      const value = event.target.value;
                      setSelectedAudioInput(value);
                      await transportRef.current?.setAudioInputDevice(value);
                    }}
                    className="mt-1 w-full rounded-xl border border-blue-200/20 bg-[#071428] px-3 py-2 text-sm text-text-primary"
                  >
                    {audioInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-text-secondary">
                  {copy.videoInput}
                  <select
                    value={selectedVideoInput}
                    onChange={async (event) => {
                      const value = event.target.value;
                      setSelectedVideoInput(value);
                      await transportRef.current?.setVideoInputDevice(value);
                    }}
                    className="mt-1 w-full rounded-xl border border-blue-200/20 bg-[#071428] px-3 py-2 text-sm text-text-primary"
                  >
                    {videoInputs.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <span className="rounded-full border border-blue-200/20 px-3 py-1">
                  {copy.connectionQuality}: {connectionQuality === null ? "n/a" : `${connectionQuality}%`}
                </span>
                {role === "staff" ? (
                  <span className="rounded-full border border-blue-200/20 px-3 py-1">
                    {copy.enableLobby}
                  </span>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-2xl border border-blue-200/20 bg-[#030a1c]">
                <div ref={jitsiContainerRef} className="h-[420px] w-full md:h-[520px]" />
              </div>

              {deviceCheckResult ? (
                <p className="mb-4 text-xs text-text-secondary">
                  Device check: camera {String(deviceCheckResult.cameraReady)} / microphone {String(deviceCheckResult.microphoneReady)}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(data.participants ?? []).map((participant) => (
                  <PrimeCard key={String(participant.id)} className="rounded-xl p-3 text-sm text-text-primary">
                    <p className="font-medium">{String(participant.participant_role ?? "participant")}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{String(participant.presence_status ?? "invited")}</p>
                  </PrimeCard>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {permissions.canJoinMeeting ? (
                <button onClick={joinMeeting} className={primeButtonClasses("primary")}>
                  {copy.join}
                </button>
              ) : null}
              {permissions.canJoinMeeting ? (
                <button onClick={leaveMeeting} className={primeButtonClasses("secondary")}>
                  {copy.leave}
                </button>
              ) : null}
              {role === "staff" && permissions.canStartOrEndMeeting ? (
                <>
                  <button onClick={() => startOrEndMeeting("start")} className={primeButtonClasses("secondary")}>
                    {copy.start}
                  </button>
                  <button onClick={() => startOrEndMeeting("end")} className={primeButtonClasses("secondary")}>
                    {copy.end}
                  </button>
                  <button onClick={() => updateScheduleOrStatus({ status: "cancelled" })} className="rounded-full border border-red-400/30 px-5 py-3 text-sm font-semibold text-red-200">
                    Cancel interview
                  </button>
                </>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-blue-200/20 px-4 py-2 text-xs font-semibold text-text-secondary">
                {copy.timer}: {timerValue}
              </span>
            </div>

            {role === "staff" ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <PrimeInput
                  type="datetime-local"
                  value={rescheduleAt}
                  onChange={(event) => setRescheduleAt(event.target.value)}
                />
                <button
                  onClick={() => updateScheduleOrStatus({ scheduledAt: rescheduleAt })}
                  className={primeButtonClasses("secondary", "sm")}
                >
                  Reschedule
                </button>
              </div>
            ) : null}
          </PrimeCard>

          <article className="space-y-5">
            <PrimeCard as="section" className="p-5">
              <h2 className="font-heading text-2xl text-text-primary">{copy.chat}</h2>
              <div className="mt-4 max-h-[240px] space-y-2 overflow-y-auto">
                {(data.chatMessages ?? []).length === 0 ? <p className="text-sm text-text-tertiary">{copy.noChat}</p> : null}
                {(data.chatMessages ?? []).map((item) => (
                  <PrimeCard key={String(item.id)} className="rounded-xl p-3 text-sm">
                    <p className="text-xs text-text-tertiary">{String(item.sender_role ?? "participant")}</p>
                    <p className="mt-1 text-text-primary">{String(item.body ?? "")}</p>
                  </PrimeCard>
                ))}
              </div>
              {permissions.canSendChat ? (
                <div className="mt-4 space-y-2">
                  <PrimeTextarea
                    value={chatBody}
                    onChange={(event) => setChatBody(event.target.value)}
                    rows={3}
                    placeholder={copy.chatPlaceholder}
                  />
                  <button onClick={sendChat} className={primeButtonClasses("primary")}>
                    {copy.send}
                  </button>
                </div>
              ) : null}
            </PrimeCard>

            <PrimeCard as="section" className="p-5">
              <h2 className="font-heading text-2xl text-text-primary">{copy.history}</h2>
              <div className="mt-4 max-h-[200px] space-y-2 overflow-y-auto">
                {(data.history ?? []).map((event) => (
                  <PrimeCard key={String(event.id)} className="rounded-xl p-3 text-xs text-text-secondary">
                    <p className="font-medium text-text-primary">{String(event.event_type ?? "event")}</p>
                    <p className="mt-1">{String(event.created_at ?? "")}</p>
                  </PrimeCard>
                ))}
              </div>
            </PrimeCard>
          </article>
        </section>
      </PrimeCard>
    </main>
  );
}
