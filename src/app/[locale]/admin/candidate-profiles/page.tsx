"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type CandidateRow = {
  candidate_id: string;
  candidate_reference: string;
  professional_title: string | null;
  professional_summary: string | null;
  general_location: string | null;
  profile_status: string;
  generated_at: string;
};

export default function AdminCandidateProfilesPage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params.locale ?? "en");
  const [hasSession, setHasSession] = useState(false);
  const [profiles, setProfiles] = useState<CandidateRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "ملفات المرشحين بانتظار المراجعة",
            subtitle: "تأكد من تنقيح ملف المرشح واعتماد النسخة الموجهة لأصحاب العمل فقط.",
            empty: "لا توجد ملفات حالياً.",
          }
        : {
            title: "Pending AI Candidate Profiles",
            subtitle: "Review the sanitized employer-facing profile before it is approved.",
            empty: "No candidate profiles found.",
          },
    [locale]
  );

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) return;
        setHasSession(true);

        return fetch("/api/admin/candidate-profiles?status=pending_review", {
          credentials: "include",
        })
          .then((response) => response.json())
          .then((payload) => setProfiles(payload?.data ?? []));
      })
      .catch(() => setError("Failed to load candidate profiles"));
  }, []);

  useEffect(() => {
    if (!hasSession) return;
  }, [hasSession]);

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        <p className="mt-3 text-sm text-text-secondary">{copy.subtitle}</p>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {profiles.map((profile) => (
            <Link
              key={profile.candidate_id}
              href={`/${locale}/admin/candidate-profiles/${profile.candidate_id}`}
              className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5 transition hover:border-gold/40 hover:bg-bg-primary"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-text-primary">{profile.candidate_reference}</h2>
                <span className="rounded-full border border-gold/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-gold">
                  {profile.profile_status}
                </span>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{profile.professional_title ?? "Professional profile pending"}</p>
              <p className="mt-2 text-sm text-text-tertiary">{profile.general_location ?? "Location not set"}</p>
            </Link>
          ))}
        </div>

        {profiles.length === 0 ? <p className="mt-8 text-sm text-text-secondary">{copy.empty}</p> : null}
      </section>
    </main>
  );
}
