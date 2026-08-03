"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  employerInput,
  employerPageShell,
  employerSectionCard,
  employerSurfaceCard,
} from "@/features/employers/ui/portal-theme";

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
        ? { title: "المترشحون", subtitle: "راجع المتقدمين والملفات المعتمدة في مكان واحد.", empty: "لا يوجد مترشحون متاحون حالياً." }
        : { title: "Candidates", subtitle: "Review applicants and approved profiles in one place.", empty: "No candidates available yet." },
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
    <main className={employerPageShell}>
      <section className={employerSurfaceCard}>
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        <p className="mt-3 text-sm text-text-secondary">{copy.subtitle}</p>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "ar" ? "ابحث بالمرجع أو المسمى أو الموقع" : "Search by reference, title, or location"}
          className={`mt-6 ${employerInput}`}
        />

        {profiles.length === 0 ? (
          <article className={`mt-8 ${employerSectionCard} text-sm text-text-secondary`}>
            {copy.empty}
          </article>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {profiles.map((profile) => (
            <Link
              key={profile.candidate_id}
              href={`/${locale}/employers/candidate-profiles/${profile.candidate_id}`}
              className={`${employerSectionCard} hover:border-gold/40 hover:bg-bg-primary`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-text-primary">{profile.candidate_reference}</h2>
                <span className="text-xs uppercase tracking-[0.16em] text-gold">{locale === "ar" ? "معتمد" : "Approved"}</span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{profile.professional_title ?? profile.desired_role ?? (locale === "ar" ? "ملف مهني" : "Professional profile")}</p>
              <p className="mt-2 text-sm text-text-tertiary">{profile.general_location ?? (locale === "ar" ? "الموقع محمي" : "Location protected")}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
