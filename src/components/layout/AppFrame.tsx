"use client";

import { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import type { AppRole } from "@/lib/server/security/auth";

type AppFrameProps = {
  children: ReactNode;
  initialRole?: AppRole | null;
};

export function AppFrame({ children, initialRole = null }: AppFrameProps) {
  const pathname = usePathname();
  const [resolvedRole, setResolvedRole] = useState<AppRole | null>(initialRole);
  const internalPrefix = "/admin";
  const employerPrefix = "/employers";
  const isInternalRoute = pathname === internalPrefix || pathname.startsWith(`${internalPrefix}/`);
  const isEmployerRoute = pathname === employerPrefix || pathname.startsWith(`${employerPrefix}/`);
  const isEmployerSession = resolvedRole === "employer";

  useEffect(() => {
    let cancelled = false;

    async function resolveRole() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        const payload = await response.json().catch(() => null);
        const role = payload?.success ? String(payload?.data?.role ?? "") : "";
        const nextRole =
          role === "candidate" ||
          role === "employer" ||
          role === "prime_global_recruiter" ||
          role === "prime_global_admin" ||
          role === "admin" ||
          role === "super_admin"
            ? (role as AppRole)
            : null;

        if (!cancelled) {
          setResolvedRole(nextRole);
        }
      } catch {
        if (!cancelled) {
          setResolvedRole(null);
        }
      }
    }

    void resolveRole();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (isInternalRoute || isEmployerRoute || (isEmployerSession && isEmployerRoute)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
