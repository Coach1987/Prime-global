"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CandidateLoginPage() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((res) => res.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email, password, role: "candidate" }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data?.session?.accessToken) {
        setError(payload?.error?.message ?? "Unable to sign in");
        return;
      }

      localStorage.setItem("prime_auth_token", payload.data.session.accessToken);
      router.push(`/${params.locale}/candidate/my-interviews`);
    } catch {
      setError("Unexpected error while logging in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-8 backdrop-blur-xl">
        <h1 className="font-heading text-4xl text-text-primary">Candidate Login</h1>
        <p className="mt-3 text-sm text-text-secondary">Sign in to access My Interviews and protected conversation workflow.</p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-secondary">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-text-primary"
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-bg-primary transition hover:bg-gold-bright disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
