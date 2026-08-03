"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/layout/Header/LanguageSwitcher";
import { emitAuthSessionChanged } from "@/lib/auth/client-session-sync";

type EmployerPortalShellProps = {
  locale: string;
  children: React.ReactNode;
};

type ProfilePayload = {
  company_name?: string;
  verification_status?: string | null;
};

type PortalNavItem = {
  href: string;
  en: string;
  ar: string;
};

const NAV_ITEMS: PortalNavItem[] = [
  { href: "/employers/dashboard", en: "Dashboard", ar: "لوحة الشركة" },
  { href: "/employers/company-profile", en: "Company Profile", ar: "ملف الشركة" },
  { href: "/employers/jobs", en: "Jobs", ar: "الوظائف" },
  { href: "/employers/advertisements", en: "Advertisements", ar: "الإعلانات" },
  { href: "/employers/settings", en: "Settings", ar: "الإعدادات" },
];

function getVerificationLabel(locale: string, status: string | null | undefined) {
  if (status === "verified") {
    return locale === "ar" ? "معتمد" : "Verified";
  }
  if (status === "rejected") {
    return locale === "ar" ? "مرفوض" : "Rejected";
  }
  if (status === "suspended") {
    return locale === "ar" ? "موقوف" : "Suspended";
  }
  return locale === "ar" ? "قيد المراجعة" : "Pending Review";
}

export function EmployerPortalShell({ locale, children }: EmployerPortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menuRootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  const isArabic = locale === "ar";

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/employers/profile", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        const profile = (payload?.data ?? null) as ProfilePayload | null;

        if (!cancelled) {
          setCompanyName(profile?.company_name ?? null);
          setVerificationStatus(profile?.verification_status ?? null);
        }
      } catch {
        if (!cancelled) {
          setCompanyName(null);
          setVerificationStatus(null);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!menuRootRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const verificationLabel = useMemo(
    () => getVerificationLabel(locale, verificationStatus),
    [locale, verificationStatus]
  );

  const publicWebsiteLabel = isArabic ? "عرض الموقع العام" : "View public website";
  const logoutLabel = isArabic ? "تسجيل الخروج" : "Logout";

  const activeClass = "border-gold/40 bg-gold/10 text-gold";
  const idleClass = "border-gold/20 bg-bg-primary/45 text-text-secondary hover:border-gold/40 hover:text-text-primary";

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

    emitAuthSessionChanged({ role: null, displayName: null });
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gold/20 bg-[#06111d]/92 backdrop-blur-2xl">
        <div className="mx-auto flex h-[86px] w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/employers/dashboard" className="relative block h-10 w-36 shrink-0">
              <Image
                src="/images/logo/prime-global-logo-clean.png"
                alt="Prime Global"
                fill
                priority
                sizes="144px"
                className="object-contain object-left"
              />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {isArabic ? "بوابة الشركات" : "Employer Portal"}
              </p>
              <p className="truncate text-xs text-text-tertiary">
                {companyName ?? (isArabic ? "حساب الشركة" : "Company Account")}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors duration-200 ${active ? activeClass : idleClass}`}
                >
                  {isArabic ? item.ar : item.en}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <span className="rounded-full border border-gold/30 px-3 py-1 text-[11px] font-semibold text-gold">
              {verificationLabel}
            </span>
            <LanguageSwitcher />
            <Link href="/" className="rounded-lg border border-gold/20 px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-gold/40 hover:text-text-primary">
              {publicWebsiteLabel}
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-100 transition-colors hover:bg-red-500/10"
            >
              {logoutLabel}
            </button>
          </div>

          <div ref={menuRootRef} className="relative md:hidden">
            <button
              type="button"
              aria-label={isArabic ? "فتح قائمة البوابة" : "Open portal menu"}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gold/30 text-gold"
            >
              <span className="text-lg">☰</span>
            </button>

            <div
              role="menu"
              className={`absolute end-0 top-12 flex w-64 flex-col gap-2 rounded-2xl border border-gold/20 bg-[#081326]/98 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-opacity duration-150 ${menuOpen ? "visible opacity-100" : "pointer-events-none invisible opacity-0"}`}
            >
              <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.14em] text-gold">{verificationLabel}</p>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-gold/20 px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-gold/40 hover:text-text-primary"
                >
                  {isArabic ? item.ar : item.en}
                </Link>
              ))}
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-gold/20 px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-gold/40 hover:text-text-primary"
              >
                {publicWebsiteLabel}
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-lg border border-red-400/40 px-3 py-2 text-left text-sm font-semibold text-red-100 transition-colors hover:bg-red-500/10"
              >
                {logoutLabel}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-[86px]">{children}</div>
    </>
  );
}
