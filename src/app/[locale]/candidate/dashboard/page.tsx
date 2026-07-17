"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";

export default function CandidateDashboardPage() {
  const [hasSession, setHasSession] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [applications, setApplications] = useState<Array<Record<string, unknown>>>([]);
  const [savedJobs, setSavedJobs] = useState<Array<Record<string, unknown>>>([]);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const locale = useLocale();

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((payload) => {
        if (!payload?.success || payload?.data?.role !== "candidate") {
          setHasSession(false);
          return;
        }
        setHasSession(true);

        return Promise.all([
          fetch("/api/candidates/profile", { credentials: "include" }),
          fetch("/api/candidates/applications", { credentials: "include" }),
          fetch("/api/candidates/saved-jobs", { credentials: "include" }),
          fetch("/api/candidates/notifications", { credentials: "include" }),
        ])
          .then(async ([profileRes, applicationsRes, savedJobsRes, notificationsRes]) => {
            const [profilePayload, applicationsPayload, savedJobsPayload, notificationsPayload] = await Promise.all([
              profileRes.json(),
              applicationsRes.json(),
              savedJobsRes.json(),
              notificationsRes.json(),
            ]);

            setProfile(profilePayload.data ?? null);
            setApplications(applicationsPayload.data ?? []);
            setSavedJobs(savedJobsPayload.data ?? []);
            setNotifications(notificationsPayload.data ?? []);
          })
          .catch(() => undefined);
      })
      .catch(() => setHasSession(false));
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">My Interviews</h1>
        <p className="mt-3 text-sm text-text-secondary">Your protected interview invitations, waiting room readiness, and supervised meeting activity.</p>

        <a href={`/${locale}/matching/v2`} className="mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Open AI Matching V2
        </a>
        <a href={`/${locale}/candidate/my-interviews`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Open My Interviews
        </a>
        <a href={`/${locale}/candidate/supervised-conversations`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Supervised Conversations
        </a>
        <a href={`/${locale}/candidate/job-alert-settings`} className="ml-3 mt-6 inline-flex rounded-full border border-gold/30 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
          Job Alert Settings
        </a>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Profile", profile ? "Complete" : hasSession ? "Pending" : "No Session"],
            ["Applied Jobs", String(applications.length)],
            ["Saved Jobs", String(savedJobs.length)],
            ["Notifications", String(notifications.length)],
          ].map(([label, value], index) => (
            <article key={`${label}-${index}`} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-gold">{value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
