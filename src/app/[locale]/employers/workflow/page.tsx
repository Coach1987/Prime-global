"use client";

import { useEffect, useState } from "react";

type WorkflowItem = {
  applicationId: string;
  currentStage: string;
  appliedAt: string;
  updatedAt: string;
  job: { id: string; title: string };
  candidate: { id: string; reference: string; title: string | null };
  workflowHistory: Array<{
    id: string;
    previous_status: string | null;
    next_status: string;
    note: string | null;
    created_at: string;
  }>;
};

export default function EmployerWorkflowPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorkflowItem[]>([]);

  useEffect(() => {
    fetch("/api/employers/workflow", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.success) setData(payload.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">Loading workflow...</main>;

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">Recruitment Workflow Tracker</h1>
        <p className="mt-3 text-sm text-text-secondary">Track every application stage, transition history, and current workflow state.</p>

        <div className="mt-6 space-y-4">
          {data.map((item) => (
            <article key={item.applicationId} className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl text-text-primary">{item.job?.title ?? "Job"}</h2>
                  <p className="text-sm text-text-secondary">Candidate: {item.candidate?.reference ?? "PG Candidate"}</p>
                </div>
                <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">{item.currentStage}</span>
              </div>

              <p className="mt-3 text-sm text-text-secondary">Applied: {new Date(item.appliedAt).toLocaleString()}</p>
              <p className="mt-1 text-sm text-text-secondary">Updated: {new Date(item.updatedAt).toLocaleString()}</p>

              <section className="mt-4 rounded-xl border border-gold/15 bg-bg-primary/70 p-4">
                <h3 className="text-sm font-semibold text-text-primary">Workflow Progress</h3>
                <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                  {(item.workflowHistory ?? []).map((event) => (
                    <li key={event.id}>
                      {event.previous_status ?? "new"} → {event.next_status} ({new Date(event.created_at).toLocaleString()})
                      {event.note ? ` - ${event.note}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
