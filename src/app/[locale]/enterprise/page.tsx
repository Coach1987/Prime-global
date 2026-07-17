"use client";

import { useEffect, useState } from "react";

export default function EnterpriseCenterPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) return;
        return fetch("/api/enterprise/overview", { credentials: "include" })
          .then((res) => res.json())
          .then((payload) => setData(payload?.data ?? null));
      })
      .catch(() => undefined);
  }, []);

  const trustScore = data?.trustScore as Record<string, unknown> | null;
  const contracts = (data?.contracts as Array<Record<string, unknown>> | undefined) ?? [];
  const verification = (data?.verification as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Enterprise Center</p>
        <h1 className="mt-4 font-heading text-4xl text-text-primary">Trust Score, Contracts, and Documents</h1>
        <p className="mt-4 max-w-3xl text-sm text-text-secondary">
          A single command center for enterprise verification status, digital contract activity, and document visibility.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Trust Badge", String(trustScore?.trust_badge ?? "bronze")],
            ["Verification Score", String(trustScore?.verification_score ?? 0)],
            ["Contracts", String(contracts.length)],
            ["Verification Requests", String(verification.length)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-gold">{value}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Digital Contracts</h2>
            <div className="mt-4 space-y-3">
              {contracts.map((contract) => (
                <article key={String(contract.id)} className="rounded-xl border border-gold/15 p-4 text-sm text-text-secondary">
                  <p className="text-text-primary">Status: {String(contract.status ?? "generated")}</p>
                  <p className="mt-1">Signed at: {String(contract.signed_at ?? "Pending")}</p>
                  <p className="mt-1 break-all">Path: {String(contract.contract_storage_path ?? "Unavailable")}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
            <h2 className="font-heading text-2xl text-text-primary">Document Center</h2>
            <div className="mt-4 space-y-3">
              {verification.map((item) => (
                <article key={String(item.id)} className="rounded-xl border border-gold/15 p-4 text-sm text-text-secondary">
                  <p className="text-text-primary">{String(item.company_name ?? "Verification Document")}</p>
                  <p className="mt-1">Request status: {String(item.status ?? "pending")}</p>
                  <p className="mt-1">Created: {String(item.created_at ?? "")}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
