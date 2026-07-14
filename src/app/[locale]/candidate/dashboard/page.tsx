"use client";

import { useEffect, useState } from "react";

export default function CandidateDashboardPage() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [applications, setApplications] = useState<Array<Record<string, unknown>>>([]);
  const [savedJobs, setSavedJobs] = useState<Array<Record<string, unknown>>>([]);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    setToken(accessToken);
    if (!accessToken) return;

    Promise.all([
      fetch("/api/candidates/profile", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/candidates/applications", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/candidates/saved-jobs", { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch("/api/candidates/notifications", { headers: { Authorization: `Bearer ${accessToken}` } }),
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
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Candidate Dashboard</h1>
        <p className="mt-3 text-sm text-text-secondary">Profile, resumes, saved jobs, applications, status updates, and settings.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Profile", profile ? "Complete" : token ? "Pending" : "No Session"],
            ["Applied Jobs", String(applications.length)],
            ["Saved Jobs", String(savedJobs.length)],
            ["Notifications", String(notifications.length)],
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
