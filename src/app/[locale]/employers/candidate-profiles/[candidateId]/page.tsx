"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type CandidateDetail = {
  candidate_id: string;
  candidate_reference: string;
  professional_title: string | null;
  professional_summary: string | null;
  years_of_experience: number | null;
  skills: string[];
  employment_history: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  languages: string[];
  general_location: string | null;
  availability: string | null;
  desired_role: string | null;
  ai_summary: string | null;
  profile_status: string;
  prime_global_verification_status?: string | null;
};

export default function EmployerCandidateProfileDetailPage() {
  const params = useParams<{ locale: string; candidateId: string }>();
  const locale = String(params.locale ?? "en");
  const candidateId = String(params.candidateId ?? "");
  const [hasSession, setHasSession] = useState(false);
  const [profile, setProfile] = useState<CandidateDetail | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [requestState, setRequestState] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState("");

  const copy = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "ملف مرشح مجهول",
            requestConversation: "طلب محادثة خاضعة للإشراف",
            openConversations: "فتح مركز المحادثات",
            requestInterview: "طلب مقابلة عبر برايم جلوبال",
            downloadPdf: "تحميل ملف المرشح المعتمد",
            contactNote: "معلومات الاتصال محمية، وجميع الخطوات تتم عبر برايم جلوبال.",
          }
        : {
            title: "Anonymized Candidate Profile",
            requestConversation: "Request Supervised Conversation",
            openConversations: "Open Conversation Center",
            requestInterview: "Request Interview Through Prime Global",
            downloadPdf: "Download Prime Global Candidate Profile",
            contactNote: "Contact information is protected. All steps are managed through Prime Global.",
          },
    [locale]
  );

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setHasSession(Boolean(payload?.success && payload?.data?.role === "employer")))
      .catch(() => setHasSession(false));

    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  useEffect(() => {
    if (!hasSession || !candidateId) return;

    fetch(`/api/employers/candidate-profiles/${candidateId}`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => setProfile(payload?.data ?? null))
      .catch(() => undefined);

    fetch("/api/matching/v2/employer-candidates", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => {
        const match = (payload?.data?.topCandidates ?? []).find((item: Record<string, unknown>) => item.candidateId === candidateId);
        setMatchScore(typeof match?.compatibilityScore === "number" ? match.compatibilityScore : null);
      })
      .catch(() => undefined);
  }, [candidateId, hasSession]);

  async function requestInterview() {
    if (!hasSession) return;

    await fetch(`/api/employers/candidate-profiles/${candidateId}/interview-request?note=${encodeURIComponent(note)}`, {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
    });
  }

  async function requestConversation() {
    if (!hasSession) return;

    const response = await fetch("/api/recruitment/conversation-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        candidateId,
        requestedMessage:
          note ||
          (locale === "ar"
            ? "نطلب فتح محادثة مهنية خاضعة لإشراف برايم جلوبال لهذا المرشح الموافق عليه."
            : "We request a supervised professional conversation for this approved candidate profile."),
        locale,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setRequestState(payload?.error?.message ?? "Unable to create conversation request");
      return;
    }

    setRequestState(locale === "ar" ? "تم إرسال الطلب إلى برايم جلوبال للمراجعة والإسناد." : "The request was sent to Prime Global for review and assignment.");
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        <p className="mt-3 text-sm text-text-secondary">{copy.contactNote}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Reference</p>
            <h2 className="mt-2 font-heading text-3xl text-text-primary">{profile?.candidate_reference ?? "-"}</h2>
            <p className="mt-4 text-sm text-text-secondary">{profile?.professional_title ?? profile?.desired_role ?? "Profile pending"}</p>
            <p className="mt-2 text-sm text-text-tertiary">{profile?.general_location ?? "Location protected"}</p>
            <p className="mt-4 text-sm text-gold">Match score: {matchScore ?? "N/A"}</p>
          </article>

          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">AI summary</h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{profile?.ai_summary ?? profile?.professional_summary ?? "No summary available."}</p>
            <div className="mt-5 space-y-2 text-sm text-text-secondary">
              <p><span className="text-text-tertiary">Experience:</span> {profile?.years_of_experience ?? "-"}</p>
              <p><span className="text-text-tertiary">Availability:</span> {profile?.availability ?? "-"}</p>
              <p><span className="text-text-tertiary">Prime Global verification:</span> {profile?.prime_global_verification_status ?? "verified"}</p>
            </div>
          </article>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Skills and languages</h2>
            <p className="mt-3 text-sm text-text-secondary">Skills: {(profile?.skills ?? []).join(", ") || "-"}</p>
            <p className="mt-2 text-sm text-text-secondary">Languages: {(profile?.languages ?? []).join(", ") || "-"}</p>
          </article>
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Education and certificates</h2>
            <pre className="mt-3 overflow-auto rounded-xl bg-bg-secondary p-4 text-xs text-text-secondary">{JSON.stringify({ education: profile?.education ?? [], certifications: profile?.certifications ?? [] }, null, 2)}</pre>
          </article>
        </div>

        <article className="mt-6 rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
          <h2 className="font-heading text-2xl text-text-primary">{copy.requestConversation}</h2>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Prime Global note" className="mt-4 w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-3 text-sm text-text-primary" />
          {requestState ? <p className="mt-4 text-sm text-text-secondary">{requestState}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={requestConversation} className="rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
              {copy.requestConversation}
            </button>
            <button onClick={requestInterview} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold">
              {copy.requestInterview}
            </button>
            <a
              href={`/api/employers/candidate-profiles/${candidateId}/pdf`}
              className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10"
            >
              {copy.downloadPdf}
            </a>
            <a href={`/${locale}/employers/supervised-conversations`} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
              {copy.openConversations}
            </a>
          </div>
        </article>
      </section>
    </main>
  );
}
