"use client";

import { useEffect, useState } from "react";

type Insight = {
  candidateId?: string;
  candidateName?: string;
  jobId?: string;
  jobTitle?: string;
  compatibilityScore: number;
  confidenceScore: number;
  strengths: string[];
  risks: string[];
  recommendations: string[];
};

export default function MatchingV2Page() {
  const [hasSession, setHasSession] = useState(false);
  const [candidateMatches, setCandidateMatches] = useState<Insight[]>([]);
  const [employerMatches, setEmployerMatches] = useState<Insight[]>([]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setHasSession(Boolean(payload?.success)))
      .catch(() => setHasSession(false));
  }, []);

  useEffect(() => {
    if (!hasSession) return;

    Promise.all([
      fetch("/api/matching/v2/candidate", { credentials: "include" }),
      fetch("/api/matching/v2/employer-candidates", { credentials: "include" }),
    ])
      .then(async ([candidateRes, employerRes]) => {
        const [candidatePayload, employerPayload] = await Promise.all([candidateRes.json(), employerRes.json()]);
        setCandidateMatches(candidatePayload?.data?.recommendedJobs ?? []);
        setEmployerMatches(employerPayload?.data?.topCandidates ?? []);
      })
      .catch(() => undefined);
  }, [hasSession]);

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">AI Matching V2</p>
        <h1 className="mt-4 font-heading text-4xl text-text-primary">Compatibility, confidence, and explainable hiring signals</h1>
        <p className="mt-4 max-w-3xl text-sm text-text-secondary">
          Prime Global v2 adds a second-layer matching view with strengths, risks, recommendations, and confidence scoring for both candidate and employer workflows.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Candidate Matches</h2>
            <div className="mt-4 space-y-3">
              {candidateMatches.slice(0, 5).map((item) => (
                <article key={`${item.jobId}-${item.jobTitle}`} className="rounded-xl border border-gold/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{item.jobTitle}</p>
                      <p className="text-xs text-text-secondary">Compatibility {item.compatibilityScore} / Confidence {item.confidenceScore}</p>
                    </div>
                    <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">Top Pick</span>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">Strengths: {item.strengths.join("; ") || "None"}</p>
                  <p className="mt-2 text-sm text-text-secondary">Risks: {item.risks.join("; ") || "None"}</p>
                  <p className="mt-2 text-sm text-text-secondary">Recommendations: {item.recommendations.join("; ") || "None"}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Employer Candidates</h2>
            <div className="mt-4 space-y-3">
              {employerMatches.slice(0, 5).map((item) => (
                <article key={`${item.candidateId}-${item.candidateName}`} className="rounded-xl border border-gold/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{item.candidateName}</p>
                      <p className="text-xs text-text-secondary">Compatibility {item.compatibilityScore} / Confidence {item.confidenceScore}</p>
                    </div>
                    <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">Shortlist</span>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">Strengths: {item.strengths.join("; ") || "None"}</p>
                  <p className="mt-2 text-sm text-text-secondary">Risks: {item.risks.join("; ") || "None"}</p>
                  <p className="mt-2 text-sm text-text-secondary">Recommendations: {item.recommendations.join("; ") || "None"}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
