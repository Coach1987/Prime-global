"use client";

import { FormEvent, useEffect, useState } from "react";

export default function MessagesPage() {
  const [token, setToken] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    setToken(localStorage.getItem("prime_auth_token") ?? "");
  }, []);

  useEffect(() => {
    if (!token) return;

    fetch("/api/messages", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((payload) => setMessages(payload?.data ?? []))
      .catch(() => undefined);
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, body }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) return;

    setMessages((prev) => [...prev, payload.data]);
    setBody("");
  }

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">Secure Messaging</h1>
        <p className="mt-3 text-sm text-text-secondary">Employer ↔ Candidate conversation history with attachments and read status.</p>

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <input value={conversationId} onChange={(e) => setConversationId(e.target.value)} placeholder="Conversation ID" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary" />
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" className="rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary md:col-span-2" />
          <button type="submit" className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary md:col-span-2">Send Message</button>
        </form>

        <div className="mt-10 space-y-3">
          {messages.map((message) => (
            <article key={String(message.id)} className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-4">
              <p className="text-sm text-text-primary">{String(message.body ?? "")}</p>
              <p className="mt-2 text-xs text-text-tertiary">{String(message.created_at ?? "")}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
