"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, Link } from "@/i18n/routing";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { emitAuthSessionChanged } from "@/lib/auth/client-session-sync";

type InternalRole = "prime_global_recruiter" | "prime_global_admin" | "admin" | "super_admin";

type InternalManagementShellProps = {
  locale: string;
  children: ReactNode;
};

type AuthPayload = {
  success?: boolean;
  data?: {
    role?: string;
    displayName?: string | null;
  };
};

function isInternalRole(role: string | null | undefined): role is InternalRole {
  return role === "prime_global_recruiter" || role === "prime_global_admin" || role === "admin" || role === "super_admin";
}

export function InternalManagementShell({ locale, children }: InternalManagementShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [resolved, setResolved] = useState(false);
  const [role, setRole] = useState<InternalRole | null>(null);
  const isLoginRoute = pathname === `/${locale}/admin/login`;

  useEffect(() => {
    if (isLoginRoute) {
      setResolved(true);
      return;
    }

    fetch("/api/auth/me", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((payload: AuthPayload) => {
        const nextRole = payload?.success && isInternalRole(payload?.data?.role) ? payload.data.role : null;
        setRole(nextRole);
      })
      .catch(() => setRole(null))
      .finally(() => setResolved(true));
  }, [isLoginRoute]);

  async function handleLogout() {
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

    emitAuthSessionChanged({ role: null, displayName: null });
    router.push("/admin/login");
    router.refresh();
  }

  const copy = useMemo(() => {
    const isArabic = locale === "ar";
    return {
      internalPortal: isArabic ? "البوابة الداخلية" : "Internal Management Portal",
      dashboardControlCenter: isArabic ? "لوحة التحكم" : "Dashboard / Control Center",
      staffDashboard: isArabic ? "لوحة الموظف" : "Staff Dashboard",
      account: isArabic ? "الحساب" : "Account",
      logout: isArabic ? "تسجيل الخروج" : "Logout",
      modules: isArabic ? "الوحدات" : "Modules",
      recruitment: isArabic ? "مركز التوظيف" : "Recruitment Center",
      candidateProfiles: isArabic ? "ملفات المرشحين" : "Candidate Profiles",
      advertisements: isArabic ? "مركز الإعلانات" : "Advertisements Center",
    };
  }, [locale]);

  const isOwnerOrAdmin = role === "prime_global_admin" || role === "admin" || role === "super_admin";

  const moduleLinks = isOwnerOrAdmin
    ? [
        { href: "/admin/recruitment", label: copy.recruitment },
        { href: "/admin/candidate-profiles", label: copy.candidateProfiles },
        { href: "/admin/advertisements", label: copy.advertisements },
      ]
    : [
        { href: "/admin/recruitment", label: copy.recruitment },
        { href: "/admin/candidate-profiles", label: copy.candidateProfiles },
      ];

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-blue-200/20 bg-[#06111d]/92 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1380px] items-center justify-between gap-3 px-4 sm:px-6 md:px-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-blue-200/80">Prime Global</p>
            <p className="text-sm font-semibold text-text-primary">{copy.internalPortal}</p>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/admin/control-center" className={primeButtonClasses("secondary", "sm")}>
              {isOwnerOrAdmin ? copy.dashboardControlCenter : copy.staffDashboard}
            </Link>
            <Link href="/admin/dashboard" className={primeButtonClasses("secondary", "sm")}>
              {copy.account}
            </Link>
            {resolved && role ? (
              moduleLinks.map((item) => (
                <Link key={item.href} href={item.href} className={primeButtonClasses("secondary", "sm")}>
                  {item.label}
                </Link>
              ))
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-red-400/40 px-4 text-xs font-semibold text-red-100 transition hover:bg-red-500/10"
            >
              {copy.logout}
            </button>
          </nav>
        </div>

        <div className="mx-auto flex w-full max-w-[1380px] flex-wrap gap-2 px-4 pb-3 sm:px-6 md:hidden">
          <Link href="/admin/control-center" className={primeButtonClasses("secondary", "sm")}>
            {isOwnerOrAdmin ? copy.dashboardControlCenter : copy.staffDashboard}
          </Link>
          <Link href="/admin/dashboard" className={primeButtonClasses("secondary", "sm")}>
            {copy.account}
          </Link>
          {resolved && role
            ? moduleLinks.map((item) => (
                <Link key={item.href} href={item.href} className={primeButtonClasses("secondary", "sm")}>
                  {item.label}
                </Link>
              ))
            : null}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-red-400/40 px-4 text-xs font-semibold text-red-100 transition hover:bg-red-500/10"
          >
            {copy.logout}
          </button>
        </div>
      </header>

      {children}
    </>
  );
}
