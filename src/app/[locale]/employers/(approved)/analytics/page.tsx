"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

export default function EmployerAnalyticsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const locale = useLocale();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success || payload?.data?.role !== "employer") return;
        return fetch("/api/dashboard/premium", {
          credentials: "include",
        })
          .then((res) => res.json())
          .then((payload) => setStats(payload?.data ?? null));
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Premium Hiring Analytics</h1>
        <p className="mt-3 text-sm text-text-secondary">Hiring funnel, applications, interviews, accepted, rejected, and time-to-hire.</p>

        <a href={`/${locale}/matching/v2`} className="mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Review AI Matching V2
        </a>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Applications", String(stats?.applications ?? 0)],
            ["Interviews", String(stats?.interviews ?? 0)],
            ["Accepted", String(stats?.accepted ?? 0)],
            ["Rejected", String(stats?.rejected ?? 0)],
            ["Time To Hire", `${String(stats?.timeToHire ?? 0)} days`],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-gold">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
