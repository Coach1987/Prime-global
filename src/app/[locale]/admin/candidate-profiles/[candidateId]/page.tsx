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
  expected_salary: number | null;
  ai_summary: string | null;
  profile_status: string;
  candidate_private_profiles?: Array<{
    full_name: string;
    email: string;
    phone: string;
    address: string | null;
    original_cv_path: string;
    original_documents_paths: string[];
  }>;
  candidate_profile_reviews?: Array<{ id: string; status: string; notes: string | null; reviewed_at: string | null }>;
};

export default function AdminCandidateProfileDetailPage() {
  const params = useParams<{ locale: string; candidateId: string }>();
  const locale = String(params.locale ?? "en");
  const candidateId = String(params.candidateId ?? "");
  const [hasSession, setHasSession] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [profile, setProfile] = useState<CandidateDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "مراجعة ملف المرشح",
            approve: "اعتماد",
            reject: "رفض",
            changes: "يحتاج تعديلات",
            regenerate: "إعادة توليد",
            save: "حفظ التعديلات",
          }
        : {
            title: "Candidate Profile Review",
            approve: "Approve",
            reject: "Reject",
            changes: "Needs Changes",
            regenerate: "Regenerate",
            save: "Save Edits",
          },
    [locale]
  );

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success || !candidateId) return;
        setHasSession(true);

        return fetch(`/api/admin/candidate-profiles/${candidateId}`, {
          credentials: "include",
        })
          .then((response) => response.json())
          .then((payload) => {
            const nextProfile = payload?.data ?? null;
            setProfile(nextProfile);
            setTitle(nextProfile?.professional_title ?? "");
            setSummary(nextProfile?.professional_summary ?? "");
          });
      })
      .catch(() => setError("Failed to load candidate profile"));
  }, [candidateId]);

  async function submitAction(action: "approve" | "reject" | "needs_changes" | "regenerate") {
    if (!hasSession) return;

    const response = await fetch(`/api/admin/candidate-profiles/${candidateId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        action,
        notes,
        profilePatch: {
          professionalTitle: title,
          professionalSummary: summary,
          profileStatus: action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "regenerate" ? "pending_review" : "needs_changes",
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? "Unable to update profile");
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            professional_title: title,
            professional_summary: summary,
            profile_status: payload?.data?.status ?? current.profile_status,
          }
        : current
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1360px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Private candidate profile</h2>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <p><span className="text-text-tertiary">Reference:</span> {profile?.candidate_reference ?? "-"}</p>
              <p><span className="text-text-tertiary">Full name:</span> {profile?.candidate_private_profiles?.[0]?.full_name ?? "-"}</p>
              <p><span className="text-text-tertiary">Email:</span> {profile?.candidate_private_profiles?.[0]?.email ?? "-"}</p>
              <p><span className="text-text-tertiary">Phone:</span> {profile?.candidate_private_profiles?.[0]?.phone ?? "-"}</p>
              <p><span className="text-text-tertiary">Address:</span> {profile?.candidate_private_profiles?.[0]?.address ?? "-"}</p>
              <p><span className="text-text-tertiary">Original CV path:</span> {profile?.candidate_private_profiles?.[0]?.original_cv_path ?? "-"}</p>
              <p><span className="text-text-tertiary">Supporting docs:</span> {profile?.candidate_private_profiles?.[0]?.original_documents_paths?.length ?? 0}</p>
            </div>
          </article>

          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Employer profile</h2>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2 text-sm text-text-secondary">
                <span className="block">Professional title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-3 text-text-primary" />
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                <span className="block">Professional summary</span>
                <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={6} className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-3 text-text-primary" />
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                <span className="block">Review notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-3 text-text-primary" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => submitAction("approve")} className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-bg-primary">{copy.approve}</button>
              <button onClick={() => submitAction("reject")} className="rounded-full border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200">{copy.reject}</button>
              <button onClick={() => submitAction("needs_changes")} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">{copy.changes}</button>
              <button onClick={() => submitAction("regenerate")} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">{copy.regenerate}</button>
            </div>

            <button onClick={() => submitAction("needs_changes")} className="mt-4 rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">
              {copy.save}
            </button>
          </article>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Certificates</h2>
            <pre className="mt-4 overflow-auto rounded-xl bg-bg-secondary p-4 text-xs text-text-secondary">{JSON.stringify(profile?.certifications ?? [], null, 2)}</pre>
          </article>
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Review history</h2>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              {profile?.candidate_profile_reviews?.map((review) => (
                <div key={review.id} className="rounded-xl border border-gold/10 px-4 py-3">
                  <p className="font-medium text-text-primary">{review.status}</p>
                  <p>{review.notes ?? "No notes"}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="mt-6 rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
          <h2 className="font-heading text-2xl text-text-primary">Employer-facing summary</h2>
          <p className="mt-3 text-sm text-text-secondary">{profile?.ai_summary ?? "No summary yet."}</p>
          <p className="mt-2 text-xs text-text-tertiary">Status: {profile?.profile_status ?? "unknown"}</p>
        </article>
      </section>
    </main>
  );
}
