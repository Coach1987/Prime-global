"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AuthRole, getAccountHref, getDashboardHref, normalizeAuthRole } from "@/lib/auth/routing";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { AuthSegmentedControl } from "./AuthSegmentedControl";

type AuthState = {
  role: AuthRole;
  displayName: string | null;
};

type AuthActionsProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AuthActions({ mobile = false, onNavigate }: AuthActionsProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) {
          setAuthState(null);
          return;
        }

        const role = normalizeAuthRole(String(payload?.data?.role ?? ""));
        if (!role) {
          setAuthState(null);
          return;
        }

        setAuthState({ role, displayName: payload?.data?.displayName ?? null });
      })
      .catch(() => setAuthState(null));
  }, []);

  async function handleSignOut() {
    let csrfToken = "";
    try {
      const csrfResponse = await fetch("/api/security/csrf", { credentials: "include" });
      const csrfPayload = await csrfResponse.json();
      csrfToken = csrfPayload?.data?.csrfToken ?? "";
    } catch {
      csrfToken = "";
    }

    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
    }).catch(() => undefined);
    setAuthState(null);
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  const actionClassName = mobile
    ? primeButtonClasses("secondary") + " w-full"
    : primeButtonClasses("secondary") + " min-h-11 px-4 py-2.5";

  if (!authState) {
    return <AuthSegmentedControl mobile={mobile} onNavigate={onNavigate} />;
  }

  const accountTitle = authState.displayName || t("account");

  const candidateLinks = [
    { href: getDashboardHref("candidate"), label: t("dashboard") },
    { href: getAccountHref("candidate"), label: t("careerProfile") },
    { href: "/candidate/applications", label: t("applications") },
    { href: "/candidate/my-interviews", label: t("interviews") },
    { href: "/notifications", label: t("notifications") },
    { href: "/portal", label: t("settings") },
  ];

  const employerLinks = [
    { href: getDashboardHref("employer"), label: t("dashboard") },
    { href: getAccountHref("employer"), label: t("companyProfile") },
    { href: "/employers/interview-center", label: t("interviews") },
    { href: "/notifications", label: t("notifications") },
    { href: "/portal", label: t("settings") },
  ];

  const staffLinks = [
    { href: getDashboardHref("admin"), label: t("dashboard") },
    { href: getAccountHref("admin"), label: t("account") },
  ];

  const links = authState.role === "candidate" ? candidateLinks : authState.role === "employer" ? employerLinks : staffLinks;

  return (
    <div className={mobile ? "mt-10 flex w-full flex-col gap-3" : "hidden items-center gap-2 md:flex"}>
      <div className={mobile ? "rounded-2xl border border-blue-200/20 p-4" : "group relative"}>
        <button type="button" className={mobile ? `${actionClassName} justify-start` : `${primeButtonClasses("secondary")} min-h-11 px-4 py-2.5`}>
          {accountTitle}
        </button>

        <div
          className={mobile ? "mt-3 flex flex-col gap-2" : "pointer-events-none absolute right-0 top-full z-40 mt-2 hidden w-64 flex-col gap-2 rounded-2xl border border-blue-200/20 bg-[#081326]/95 p-3 opacity-0 shadow-[0_24px_48px_rgba(2,12,25,0.55)] transition group-hover:pointer-events-auto group-hover:flex group-hover:opacity-100"}
        >
          {links.map((item) => (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={`${primeButtonClasses("secondary")} justify-start`}>
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className={mobile ? `${actionClassName} border-red-400/30 text-red-100 hover:bg-red-500/10` : "inline-flex min-h-11 items-center justify-start rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"}
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}