"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

type MatchRow = {
  matchId: string;
  jobId: string;
  jobTitle: string;
  reviewStatus: string;
  matchCategory: string;
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
  matchingTimestamp: string;
};

export default function CandidateMatchingPage() {
  const locale = useLocale();
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    fetch("/api/matching/v2/candidate", { credentials: "include" })
      .then(async (res) => {
        const payload = await res.json();
        if (res.ok && payload?.success) {
          setMatches((payload?.data?.recommendedJobs ?? []) as MatchRow[]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function applyToJob(jobId: string) {
    setMessage(null);
    const response = await fetch(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ jobId, coverLetter: "", resumeId: null }),
    });

    const payload = await response.json();
    if (response.ok && payload?.success) {
      setMessage("Application submitted successfully.");
      return;
    }

    setMessage(payload?.error?.message ?? "Unable to submit application.");
  }

  if (loading) return <main className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">Loading matching jobs...</main>;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">Smart Job Matching</h1>
        <p className="mt-3 text-sm text-text-secondary">Advisory matching generated from your canonical candidate profile. Prime Global staff keeps final decisions.</p>

        {message ? <p className="mt-4 text-sm text-emerald-200">{message}</p> : null}

        <div className="mt-6 space-y-4">
          {matches.map((match) => (
            <article key={match.matchId} className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl text-text-primary">{match.jobTitle}</h2>
                  <p className="text-xs text-text-secondary">Updated {new Date(match.matchingTimestamp).toLocaleString(locale)}</p>
                </div>
                <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">{match.matchCategory}</span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5 text-sm text-text-secondary">
                <p>Overall: <span className="text-gold">{match.overallMatchScore}</span></p>
                <p>Skills: {match.skillsScore}</p>
                <p>Experience: {match.experienceScore}</p>
                <p>Education: {match.educationScore}</p>
                <p>Confidence: {match.confidenceScore}</p>
              </div>

              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="text-sm text-text-secondary">Strengths: {(match.strengths ?? []).join(", ") || "-"}</p>
                  <p className="mt-2 text-sm text-text-secondary">Weaknesses: {(match.weaknesses ?? []).join(", ") || "-"}</p>
                  <p className="mt-2 text-sm text-text-secondary">Missing skills: {(match.missingSkills ?? []).join(", ") || "-"}</p>
                  <p className="mt-2 text-sm text-text-secondary">Recommended improvements: {(match.recommendedImprovements ?? []).join(", ") || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-text-tertiary">Score breakdown explanation</p>
                  <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                    {Object.entries(match.scoreExplanations ?? {}).map(([key, value]) => (
                      <li key={key}><span className="text-slate-300">{key}</span>: {value}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => applyToJob(match.jobId)}
                  className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
                >
                  Apply
                </button>
                <a href={`/${locale}/candidate/applications`} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold hover:bg-gold/10">
                  Track applications
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
