"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";

type AuthMePayload = {
  success?: boolean;
  data?: {
    userId?: string;
    email?: string;
    role?: string;
    displayName?: string | null;
  };
  error?: {
    message?: string;
  };
};

function localizeRole(role: string | null | undefined, locale: string, t: ReturnType<typeof useTranslations>) {
  const normalized = String(role ?? "").trim();
  if (!normalized) return t("values.unknown");
  if (normalized === "prime_global_recruiter") return t("values.recruiter");
  if (normalized === "prime_global_admin") return t("values.owner");
  if (normalized === "admin") return t("values.admin");
  if (normalized === "super_admin") return t("values.superAdmin");
  if (locale === "ar") return t("values.unknown");
  return normalized;
}

function localizeSessionMessage(message: string | null | undefined, locale: string, t: ReturnType<typeof useTranslations>) {
  if (!message) return t("messages.loadFailed");
  if (locale !== "ar") return message;

  if (message === "No active session") return t("messages.sessionMissing");
  if (message === "Unable to load session information.") return t("messages.loadFailed");

  return message;
}

export function AdminAccountCenter({ locale }: { locale: string }) {
  const t = useTranslations("ownerPortal.account");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AuthMePayload["data"] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const payload = (await response.json()) as AuthMePayload;

        if (!payload?.success || !payload.data) {
          if (!cancelled) {
            setAccount(null);
            setError(localizeSessionMessage(payload?.error?.message, locale, t));
          }
          return;
        }

        if (!cancelled) {
          setAccount(payload.data);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(t("messages.loadFailed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [locale, t]);

  const currentLocaleLabel = locale === "ar" ? t("languageOptions.ar") : t("languageOptions.en");
  const alternateLocale = locale === "ar" ? "en" : "ar";
  const alternateLocaleLabel = alternateLocale === "ar" ? t("languageOptions.ar") : t("languageOptions.en");

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{t("title")}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">{t("subtitle")}</p>

        {loading ? <p className="mt-6 text-sm text-text-secondary">{t("messages.loading")}</p> : null}
        {error ? <p className="mt-6 text-sm text-red-300">{error}</p> : null}

        {account ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <PrimeCard className="p-5">
              <h2 className="font-heading text-2xl text-text-primary">{t("sections.profile")}</h2>
              <div className="mt-4 space-y-3 text-sm text-text-secondary">
                <p>{t("fields.displayName")}: {account.displayName ?? t("values.unknown")}</p>
                <p>{t("fields.email")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{account.email ?? "-"}</span></p>
                <p>{t("fields.role")}: {localizeRole(account.role ?? null, locale, t)}</p>
                <p>{t("fields.accountId")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{account.userId ?? "-"}</span></p>
              </div>
            </PrimeCard>

            <PrimeCard className="p-5">
              <h2 className="font-heading text-2xl text-text-primary">{t("sections.session")}</h2>
              <div className="mt-4 space-y-3 text-sm text-text-secondary">
                <p>{t("fields.locale")}: {currentLocaleLabel}</p>
                <p>{t("fields.email")}: <span dir="ltr" className="[unicode-bidi:isolate] break-all">{account.email ?? "-"}</span></p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <a href={`/${locale}/admin/account`} className={primeButtonClasses("secondary", "sm")}>{currentLocaleLabel}</a>
                  <a href={`/${alternateLocale}/admin/account`} className={primeButtonClasses("secondary", "sm")}>{alternateLocaleLabel}</a>
                </div>
              </div>
            </PrimeCard>
          </div>
        ) : null}
      </PrimeCard>
    </main>
  );
}
