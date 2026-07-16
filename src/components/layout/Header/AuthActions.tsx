"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AuthRole, getAccountHref, getDashboardHref, normalizeAuthRole } from "@/lib/auth/routing";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { AuthSegmentedControl } from "./AuthSegmentedControl";

type AuthState = {
  role: AuthRole;
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
    const accessToken = localStorage.getItem("prime_auth_token") ?? "";
    if (!accessToken) {
      setAuthState(null);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success) {
          localStorage.removeItem("prime_auth_token");
          setAuthState(null);
          return;
        }

        const role = normalizeAuthRole(String(payload?.data?.role ?? ""));
        if (!role) {
          localStorage.removeItem("prime_auth_token");
          setAuthState(null);
          return;
        }

        setAuthState({ role });
      })
      .catch(() => setAuthState(null));
  }, []);

  async function handleSignOut() {
    localStorage.removeItem("prime_auth_token");
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

  return (
    <div className={mobile ? "mt-10 flex w-full flex-col gap-3" : "hidden items-center gap-3 md:flex"}>
      <Link href={getDashboardHref(authState.role)} onClick={onNavigate} className={actionClassName}>
        {t("dashboard")}
      </Link>
      <Link href={getAccountHref(authState.role)} onClick={onNavigate} className={actionClassName}>
        {t("account")}
      </Link>
      <button type="button" onClick={handleSignOut} className={mobile ? `${actionClassName} border-red-400/30 text-red-100 hover:bg-red-500/10` : "inline-flex min-h-11 items-center justify-center rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"}>
        {t("signOut")}
      </button>
    </div>
  );
}