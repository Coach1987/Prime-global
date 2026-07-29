"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { DEFAULT_LOCALE, isLocale } from "@/lib/constants/locales";

function normalizeSupabaseProjectUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    if (normalizedPath === "/rest/v1") {
      url.pathname = "";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  }
}

function buildSupabaseClient() {
  const supabaseUrl = normalizeSupabaseProjectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public configuration is missing for password recovery callback.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAuthenticatedSession(supabase: ReturnType<typeof buildSupabaseClient>) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session?.user) {
      return data.session;
    }

    await pause(120);
  }

  return null;
}

function RecoveryCallbackContent() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => buildSupabaseClient(), []);
  const localeParam = searchParams.get("locale");
  const locale = localeParam && isLocale(localeParam) ? localeParam : DEFAULT_LOCALE;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      try {
        const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        const hashParams = new URLSearchParams(hash);

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (type && type !== "recovery") {
          if (!cancelled) {
            setError("This password reset link is invalid. Please request a new one.");
          }
          return;
        }

        if (!accessToken || !refreshToken) {
          if (!cancelled) {
            setError("Recovery token is missing. Please request a new password reset email.");
          }
          return;
        }

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (setSessionError) {
          if (!cancelled) {
            setError("Unable to start a secure recovery session. Please request a new reset email.");
          }
          return;
        }

        const activeSession = await waitForAuthenticatedSession(supabase);
        if (!activeSession?.user) {
          if (!cancelled) {
            setError("Unable to verify your recovery session. Please request a new reset email.");
          }
          return;
        }

        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        window.location.replace(`/${locale}/reset-password?recovery=1`);
      } catch {
        if (!cancelled) {
          setError("Unexpected error while validating reset link. Please request a new one.");
        }
      }
    }

    void establishRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [locale, supabase]);

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
        <PrimePageTitle>Password Recovery</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {error ? error : "Verifying your secure recovery session..."}
        </p>
        {error ? (
          <p className="mt-5 text-sm text-blue-200">
            <a href={`/${locale}/forgot-password`} className="font-semibold text-blue-200 hover:text-blue-100">
              Request a new reset email
            </a>
          </p>
        ) : null}
      </section>
    </main>
  );
}

export default function RecoveryCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
          <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
            <PrimePageTitle>Password Recovery</PrimePageTitle>
            <p className="mt-3 text-sm text-text-secondary">Loading...</p>
          </section>
        </main>
      }
    >
      <RecoveryCallbackContent />
    </Suspense>
  );
}
