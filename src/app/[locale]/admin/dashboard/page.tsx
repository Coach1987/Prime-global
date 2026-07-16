"use client";

import { useEffect, useState } from "react";

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Record<string, number> | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    if (!accessToken) return;

    fetch("/api/admin/platform", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((payload) => {
        setAnalytics(payload?.data?.analytics ?? null);
        setAuditLogs(payload?.data?.reports?.recentAuditLogs ?? []);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Control Center</h1>
        <p className="mt-3 text-sm text-text-secondary">
          Approve or reject companies, suspend bad actors, moderate jobs, and review platform analytics.
        </p>

        <a href="./control-center" className="mt-6 mr-3 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Open Control Center
        </a>

        <a href="./recruitment" className="mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Open Recruitment Supervision Center
        </a>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Companies Pending", String(analytics?.companiesPending ?? 0)],
            ["Companies Verified", String(analytics?.companiesVerified ?? 0)],
            ["Active Jobs", String(analytics?.activeJobs ?? 0)],
            ["Applications", String(analytics?.applications ?? 0)],
            ["Candidates", String(analytics?.candidates ?? 0)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-gold">{value}</p>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-gold/20 bg-bg-primary/60 p-6">
          <h2 className="font-heading text-2xl text-text-primary">Audit Logs</h2>
          <p className="mt-2 text-sm text-text-secondary">Latest administrative and security actions.</p>
          <ul className="mt-4 space-y-2 text-sm text-text-secondary">
            {auditLogs.slice(0, 10).map((item, index) => (
              <li key={String(item.id ?? index)} className="rounded-lg border border-gold/10 px-3 py-2">
                {String(item.action ?? "action")} • {String(item.created_at ?? "")}
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
