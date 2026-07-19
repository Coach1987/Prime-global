"use client";

import { useEffect, useState } from "react";

type ApplicationItem = {
  id: string;
  status: string;
  applied_at: string;
  jobs?: {
    id: string;
    title: string;
    company_name?: string | null;
    location?: string | null;
  } | null;
  workflowStatus?: {
    current: string;
    history: Array<{
      id: string;
      previous_status: string | null;
      next_status: string;
      note: string | null;
      created_at: string;
    }>;
  };
  workflowHistory?: Array<{
    id: string;
    previous_status: string | null;
    next_status: string;
    note: string | null;
    created_at: string;
  }>;
};

export default function CandidateApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [csrfToken, setCsrfToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/security/csrf"),
      fetch("/api/candidates/applications", { credentials: "include" }),
    ])
      .then(async ([csrfRes, appsRes]) => {
        const [csrfPayload, appsPayload] = await Promise.all([csrfRes.json(), appsRes.json()]);
        if (csrfRes.ok && csrfPayload?.success) setCsrfToken(csrfPayload?.data?.csrfToken ?? "");
        if (appsRes.ok && appsPayload?.success) setApplications(appsPayload.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function withdraw(applicationId: string) {
    setMessage(null);
    const response = await fetch("/api/candidates/applications", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      body: JSON.stringify({ applicationId, note: "Withdrawn by candidate" }),
    });

    const payload = await response.json();
    if (response.ok && payload?.success) {
      setMessage("Application withdrawn successfully.");
      const refreshed = await fetch("/api/candidates/applications", { credentials: "include" });
      const refreshedPayload = await refreshed.json();
      if (refreshed.ok && refreshedPayload?.success) setApplications(refreshedPayload.data ?? []);
      return;
    }

    setMessage(payload?.error?.message ?? "Unable to withdraw application.");
  }

  function getWorkflowHistory(application: ApplicationItem) {
    return application.workflowStatus?.history ?? application.workflowHistory ?? [];
  }

  if (loading) return <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">Loading applications...</main>;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">Application Journey</h1>
        <p className="mt-3 text-sm text-text-secondary">Track every stage from submission to final decision with full workflow history.</p>

        {message ? <p className="mt-4 text-sm text-emerald-200">{message}</p> : null}

        <div className="mt-6 space-y-4">
          {applications.map((application) => (
            <article key={application.id} className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl text-text-primary">{application.jobs?.title ?? "Job"}</h2>
                  <p className="text-xs text-text-secondary">{application.jobs?.company_name ?? "Employer"} · {application.jobs?.location ?? "-"}</p>
                </div>
                <span className="rounded-full border border-gold/30 px-3 py-1 text-xs text-gold">{application.status}</span>
              </div>

              <p className="mt-3 text-sm text-text-secondary">Submitted: {new Date(application.applied_at).toLocaleString()}</p>

              <section className="mt-4 rounded-xl border border-gold/15 bg-bg-primary/70 p-4">
                <h3 className="text-sm font-semibold text-text-primary">Workflow status history</h3>
                <ul className="mt-2 space-y-2 text-sm text-text-secondary">
                  {getWorkflowHistory(application).map((event) => (
                    <li key={event.id}>
                      {event.previous_status ?? "new"} → {event.next_status} ({new Date(event.created_at).toLocaleString()})
                      {event.note ? ` - ${event.note}` : ""}
                    </li>
                  ))}
                </ul>
              </section>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => withdraw(application.id)}
                  className="rounded-full border border-rose-300/40 px-5 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-400/10"
                >
                  Withdraw
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
