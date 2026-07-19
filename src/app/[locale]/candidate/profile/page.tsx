"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

type ProfilePayload = Record<string, unknown> | null;

type ProfessionalResponse = {
  data: ProfilePayload;
  intelligence?: {
    canonicalProfile?: Record<string, unknown> | null;
    reviewStatus?: Record<string, unknown> | null;
    confidence?: Record<string, unknown> | null;
    missingInformation?: Array<Record<string, unknown>>;
    reviewItems?: Array<Record<string, unknown>>;
    canonicalTimeline?: Array<Record<string, unknown>>;
  };
};

export default function CandidateProfilePage() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [professional, setProfessional] = useState<ProfessionalResponse | null>(null);
  const [completion, setCompletion] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/candidates/professional-profile", { credentials: "include" }),
      fetch("/api/candidates/profile-completion", { credentials: "include" }),
    ])
      .then(async ([professionalRes, completionRes]) => {
        const [professionalPayload, completionPayload] = await Promise.all([
          professionalRes.json(),
          completionRes.json(),
        ]);
        if (professionalRes.ok && professionalPayload?.success) setProfessional(professionalPayload as ProfessionalResponse);
        if (completionRes.ok && completionPayload?.success) setCompletion(completionPayload.data ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">Loading profile...</main>;
  }

  const intelligence = professional?.intelligence ?? {};
  const canonical = (intelligence.canonicalProfile?.canonical_payload as Record<string, unknown> | undefined) ?? {};
  const skills = Array.isArray(canonical.skills) ? canonical.skills : [];
  const experiences = Array.isArray(canonical.experiences) ? canonical.experiences : [];
  const educations = Array.isArray(canonical.educations) ? canonical.educations : [];
  const languages = Array.isArray(canonical.languages) ? canonical.languages : [];
  const certifications = Array.isArray(canonical.certifications) ? canonical.certifications : [];
  const timeline = Array.isArray(intelligence.canonicalTimeline) ? intelligence.canonicalTimeline : [];
  const missing = Array.isArray(intelligence.missingInformation) ? intelligence.missingInformation : [];

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">Candidate Professional Profile</h1>
        <p className="mt-3 text-sm text-text-secondary">Advisory AI profile built from your uploaded evidence and reviewed by Prime Global staff.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-4">
            <p className="text-xs text-text-tertiary">Profile completion</p>
            <p className="mt-2 text-xl font-semibold text-gold">{String(completion?.completionPercent ?? 0)}%</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-4">
            <p className="text-xs text-text-tertiary">Review status</p>
            <p className="mt-2 text-xl font-semibold text-gold">{String(intelligence.reviewStatus?.status ?? "pending_review")}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-4">
            <p className="text-xs text-text-tertiary">Confidence</p>
            <p className="mt-2 text-xl font-semibold text-gold">{Number((Number(intelligence.confidence?.overall_confidence ?? 0) * 100).toFixed(1))}%</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-4">
            <p className="text-xs text-text-tertiary">Missing information</p>
            <p className="mt-2 text-xl font-semibold text-gold">{missing.length}</p>
          </article>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-xl text-text-primary">Professional Profile</h2>
            <p className="mt-3 text-sm text-text-secondary">{String(canonical.summary ?? "No summary yet")}</p>
            <p className="mt-2 text-sm text-text-secondary">Headline: {String(canonical.headline ?? "-")}</p>
            <p className="mt-2 text-sm text-text-secondary">Country: {String(canonical.country ?? "-")}</p>
          </section>

          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-xl text-text-primary">Confidence Indicators</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>Skills: {Number((Number(intelligence.confidence?.skills_confidence ?? 0) * 100).toFixed(1))}%</li>
              <li>Experience: {Number((Number(intelligence.confidence?.experience_confidence ?? 0) * 100).toFixed(1))}%</li>
              <li>Education: {Number((Number(intelligence.confidence?.education_confidence ?? 0) * 100).toFixed(1))}%</li>
              <li>Certifications: {Number((Number(intelligence.confidence?.certification_confidence ?? 0) * 100).toFixed(1))}%</li>
              <li>Languages: {Number((Number(intelligence.confidence?.language_confidence ?? 0) * 100).toFixed(1))}%</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-xl text-text-primary">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((item, index) => (
                <span key={`skill-${index}`} className="rounded-full border border-gold/25 px-3 py-1 text-xs text-gold">
                  {String((item as Record<string, unknown>).skill ?? (item as Record<string, unknown>).normalizedSkillName ?? "skill")}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-xl text-text-primary">Languages</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {languages.map((item, index) => (
                <li key={`language-${index}`}>{String((item as Record<string, unknown>).languageName ?? "language")}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-xl text-text-primary">Experience</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {experiences.map((item, index) => (
                <li key={`exp-${index}`}>
                  {String((item as Record<string, unknown>).roleTitle ?? "Role")} @ {String((item as Record<string, unknown>).organizationName ?? "Organization")}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-xl text-text-primary">Education</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {educations.map((item, index) => (
                <li key={`edu-${index}`}>
                  {String((item as Record<string, unknown>).degreeTitle ?? "Degree")} @ {String((item as Record<string, unknown>).institutionName ?? "Institution")}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-xl text-text-primary">Certificates</h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {certifications.map((item, index) => (
                <li key={`cert-${index}`}>{String((item as Record<string, unknown>).certificationName ?? "Certificate")}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
          <h2 className="font-heading text-xl text-text-primary">Timeline</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {timeline.map((entry, index) => (
              <li key={`timeline-${index}`}>
                {String(entry.title ?? "Entry")} ({String(entry.entry_type ?? "milestone")})
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex gap-3">
          <a href={`/${locale}/candidate/documents`} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold">Documents</a>
          <a href={`/${locale}/candidate/matching`} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold">Matching</a>
          <a href={`/${locale}/candidate/applications`} className="rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold">Applications</a>
        </div>
      </section>
    </main>
  );
}
