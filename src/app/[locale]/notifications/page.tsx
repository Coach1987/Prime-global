"use client";

import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    if (!accessToken) return;

    fetch("/api/notifications", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((payload) => setNotifications(payload?.data ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Notification Center</h1>
        <p className="mt-3 text-sm text-text-secondary">Interview, offer, status change, and message notifications across dashboard and realtime channels.</p>

        <div className="mt-8 space-y-3">
          {notifications.map((item) => (
            <article key={String(item.id)} className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-4">
              <p className="font-medium text-text-primary">{String(item.title ?? "Notification")}</p>
              <p className="mt-1 text-sm text-text-secondary">{String(item.body ?? "")}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
