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

type MatchDetail = {
  matchId: string;
  candidateId: string;
  canonicalProfile: Record<string, unknown> | null;
  jobId: string;
  jobTitle: string;
  reviewStatus: string;
  overallMatchScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  certificationScore: number;
  languageScore: number;
  locationScore: number;
  availabilityScore: number;
  confidenceScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  recommendedImprovements: string[];
  scoreExplanations: Record<string, string>;
  staffNotes: string | null;
  matchingTimestamp: string;
};

export default function EmployerCandidateProfileDetailPage() {
  const params = useParams<{ locale: string; candidateId: string }>();
  const locale = String(params.locale ?? "en");
  const candidateId = String(params.candidateId ?? "");
  const [hasSession, setHasSession] = useState(false);
  const [profile, setProfile] = useState<CandidateDetail | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [shortlistApplicationId, setShortlistApplicationId] = useState<string | null>(null);
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
            shortlist: "إدراج في القائمة المختصرة",
            downloadPdf: "تحميل ملف المرشح المعتمد",
            contactNote: "معلومات الاتصال محمية، وجميع الخطوات تتم عبر برايم جلوبال.",
          }
        : {
            title: "Anonymized Candidate Profile",
            requestConversation: "Request Supervised Conversation",
            openConversations: "Open Conversation Center",
            requestInterview: "Request Interview Through Prime Global",
            shortlist: "Shortlist Candidate",
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

    fetch("/api/employers/matches", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => {
        const matched = (payload?.data?.matches ?? []).find((item: MatchDetail) => String(item.candidateId) === candidateId) ?? null;
        setMatch(matched);
      })
      .catch(() => undefined);

    fetch("/api/employers/applicants", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => {
        const app = (payload?.data ?? []).find((item: Record<string, unknown>) => String(item.candidate_id) === candidateId);
        setShortlistApplicationId(app?.id ? String(app.id) : null);
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

    setRequestState(locale === "ar" ? "تم إرسال طلب المقابلة." : "Interview request submitted.");
  }

  async function shortlistCandidate() {
    if (!shortlistApplicationId) {
      setRequestState(locale === "ar" ? "لا يوجد طلب تقديم مرتبط لهذا المرشح." : "No application found to shortlist.");
      return;
    }

    const response = await fetch(`/api/hr/applications/${shortlistApplicationId}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ status: "shortlisted", note: note || "shortlisted_by_employer" }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      setRequestState(payload?.error?.message ?? "Unable to shortlist candidate");
      return;
    }

    setRequestState(locale === "ar" ? "تم إدراج المرشح في القائمة المختصرة." : "Candidate shortlisted.");
  }

  const canonical = (match?.canonicalProfile ?? {}) as Record<string, unknown>;
  const canonicalSkills = Array.isArray(canonical.skills) ? canonical.skills : [];
  const canonicalExperiences = Array.isArray(canonical.experiences) ? canonical.experiences : [];
  const canonicalEducation = Array.isArray(canonical.educations) ? canonical.educations : [];
  const canonicalLanguages = Array.isArray(canonical.languages) ? canonical.languages : [];
  const canonicalCertifications = Array.isArray(canonical.certifications) ? canonical.certifications : [];

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
            <p className="mt-4 text-sm text-gold">Match score: {match?.overallMatchScore ?? "N/A"}</p>
            <p className="mt-2 text-sm text-gold">Confidence: {match?.confidenceScore ?? "N/A"}</p>
            <p className="mt-2 text-sm text-text-secondary">Review status: {match?.reviewStatus ?? "pending_review"}</p>
          </article>

          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">AI summary</h2>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{String(canonical.summary ?? profile?.ai_summary ?? profile?.professional_summary ?? "No summary available.")}</p>
            <div className="mt-5 space-y-2 text-sm text-text-secondary">
              <p><span className="text-text-tertiary">Experience:</span> {profile?.years_of_experience ?? "-"}</p>
              <p><span className="text-text-tertiary">Availability:</span> {profile?.availability ?? "-"}</p>
              <p><span className="text-text-tertiary">Prime Global verification:</span> {profile?.prime_global_verification_status ?? "verified"}</p>
              <p><span className="text-text-tertiary">Matched job:</span> {match?.jobTitle ?? "-"}</p>
              <p><span className="text-text-tertiary">Staff notes:</span> {match?.staffNotes ?? "-"}</p>
            </div>
          </article>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Canonical Skills and Languages</h2>
            <p className="mt-3 text-sm text-text-secondary">Skills: {canonicalSkills.map((item) => String((item as Record<string, unknown>).normalizedSkillName ?? (item as Record<string, unknown>).skill ?? item)).join(", ") || "-"}</p>
            <p className="mt-2 text-sm text-text-secondary">Languages: {canonicalLanguages.map((item) => String((item as Record<string, unknown>).languageName ?? item)).join(", ") || "-"}</p>
            <p className="mt-2 text-sm text-text-secondary">Strengths: {(match?.strengths ?? []).join(", ") || "-"}</p>
            <p className="mt-2 text-sm text-text-secondary">Weaknesses: {(match?.weaknesses ?? []).join(", ") || "-"}</p>
            <p className="mt-2 text-sm text-text-secondary">Missing skills: {(match?.missingSkills ?? []).join(", ") || "-"}</p>
            <p className="mt-2 text-sm text-text-secondary">Recommended improvements: {(match?.recommendedImprovements ?? []).join(", ") || "-"}</p>
          </article>
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Score Breakdown</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>Overall: {match?.overallMatchScore ?? 0}</li>
              <li>Skills: {match?.skillsScore ?? 0}</li>
              <li>Experience: {match?.experienceScore ?? 0}</li>
              <li>Education: {match?.educationScore ?? 0}</li>
              <li>Certification: {match?.certificationScore ?? 0}</li>
              <li>Language: {match?.languageScore ?? 0}</li>
              <li>Location: {match?.locationScore ?? 0}</li>
              <li>Availability: {match?.availabilityScore ?? 0}</li>
            </ul>
            <p className="mt-4 text-xs uppercase text-text-tertiary">Score explanations</p>
            <ul className="mt-2 space-y-1 text-sm text-text-secondary">
              {Object.entries(match?.scoreExplanations ?? {}).map(([key, value]) => (
                <li key={key}>{key}: {value}</li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Canonical Experience</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {canonicalExperiences.map((item, index) => (
                <li key={`exp-${index}`}>{String((item as Record<string, unknown>).roleTitle ?? "Role")} @ {String((item as Record<string, unknown>).organizationName ?? "Organization")}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Canonical Education and Certifications</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {canonicalEducation.map((item, index) => (
                <li key={`edu-${index}`}>{String((item as Record<string, unknown>).degreeTitle ?? "Degree")} @ {String((item as Record<string, unknown>).institutionName ?? "Institution")}</li>
              ))}
              {canonicalCertifications.map((item, index) => (
                <li key={`cert-${index}`}>{String((item as Record<string, unknown>).certificationName ?? "Certification")}</li>
              ))}
            </ul>
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
            <button onClick={shortlistCandidate} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold">
              {copy.shortlist}
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
