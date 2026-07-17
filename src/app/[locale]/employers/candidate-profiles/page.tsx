"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type CandidateRow = {
  candidate_id: string;
  candidate_reference: string;
  professional_title: string | null;
  professional_summary: string | null;
  years_of_experience: number | null;
  skills: string[];
  general_location: string | null;
  desired_role: string | null;
  expected_salary: number | null;
  ai_summary: string | null;
};

export default function EmployerCandidateProfilesPage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params.locale ?? "en");
  const [hasSession, setHasSession] = useState(false);
  const [profiles, setProfiles] = useState<CandidateRow[]>([]);
  const [query, setQuery] = useState("");

  const copy = useMemo(
    () =>
      locale === "ar"
        ? { title: "الملفات المهنية المجهولة", subtitle: "تعرض فقط النسخة المسموح بها لأصحاب العمل." }
        : { title: "Anonymized Candidate Profiles", subtitle: "Only approved employer-facing profiles are shown." },
    [locale]
  );

  useEffect(() => {
    if (!hasSession) return;

    const url = new URL("/api/employers/candidate-profiles", window.location.origin);
    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    }

    fetch(url.toString(), { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setProfiles(payload?.data ?? []))
      .catch(() => undefined);
  }, [query, hasSession]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setHasSession(Boolean(payload?.success && payload?.data?.role === "employer")))
      .catch(() => setHasSession(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        <p className="mt-3 text-sm text-text-secondary">{copy.subtitle}</p>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by reference, title, or location"
          className="mt-6 w-full rounded-xl border border-gold/15 bg-bg-primary px-4 py-3 text-sm text-text-primary"
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {profiles.map((profile) => (
            <Link
              key={profile.candidate_id}
              href={`/${locale}/employers/candidate-profiles/${profile.candidate_id}`}
              className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5 transition hover:border-gold/40 hover:bg-bg-primary"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-text-primary">{profile.candidate_reference}</h2>
                <span className="text-xs uppercase tracking-[0.16em] text-gold">Approved</span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{profile.professional_title ?? profile.desired_role ?? "Professional profile"}</p>
              <p className="mt-2 text-sm text-text-tertiary">{profile.general_location ?? "Location protected"}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
