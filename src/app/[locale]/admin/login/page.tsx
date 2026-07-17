"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

export default function StaffLoginPage() {
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

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        const role = String(payload?.data?.role ?? "");
        const isStaff = role === "prime_global_recruiter" || role === "prime_global_admin" || role === "admin" || role === "super_admin";
        if (payload?.success && isStaff) {
          router.push(`/${params.locale}/admin/control-center`);
        }
      })
      .catch(() => undefined);
  }, [params.locale, router]);

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
        body: JSON.stringify({ email, password, role: "staff" }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload?.error?.message ?? "Unable to sign in");
        return;
      }

      router.push(`/${params.locale}/admin/control-center`);
    } catch {
      setError("Unexpected error while logging in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8">
        <PrimePageTitle>Prime Global Staff Login</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">Access Control Center for supervised chat and interview governance.</p>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm text-text-secondary">Staff Email</label>
            <PrimeInput
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-text-secondary">Password</label>
            <PrimeInput
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className={primeButtonClasses("primary")}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </PrimeCard>
    </main>
  );
}
