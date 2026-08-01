"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AuthRole, getAccountHref, getDashboardHref, normalizeAuthRole } from "@/lib/auth/routing";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { emitAuthSessionChanged, subscribeAuthSessionChanged } from "@/lib/auth/client-session-sync";
import { AuthSegmentedControl } from "./AuthSegmentedControl";

type AuthState = {
  role: AuthRole;
  displayName: string | null;
  hasPhoto?: boolean;
};

type AuthActionsProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AuthActions({ mobile = false, onNavigate }: AuthActionsProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const menuId = useId();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [resolved, setResolved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const refreshInFlight = useRef(false);
  const refreshQueued = useRef(false);
  const menuRootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const menuItemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);

  function clearPendingClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function closeMenu(options?: { focusTrigger?: boolean }) {
    clearPendingClose();
    setMenuOpen(false);
    if (options?.focusTrigger) {
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }

  function scheduleClose() {
    clearPendingClose();
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 350);
  }

  function focusMenuItem(index: number) {
    const items = menuItemRefs.current.filter(Boolean) as Array<HTMLAnchorElement | HTMLButtonElement>;
    if (!items.length) return;

    const boundedIndex = Math.min(Math.max(index, 0), items.length - 1);
    items[boundedIndex]?.focus();
  }

  function openMenu(options?: { focusIndex?: number }) {
    clearPendingClose();
    setMenuOpen(true);
    if (typeof options?.focusIndex === "number") {
      window.requestAnimationFrame(() => focusMenuItem(options.focusIndex!));
    }
  }

  function getFocusableElements() {
    const items = menuItemRefs.current.filter(Boolean) as Array<HTMLAnchorElement | HTMLButtonElement>;
    return [triggerRef.current, ...items].filter(Boolean) as Array<HTMLElement>;
  }

  async function refreshAuthState() {
    if (refreshInFlight.current) {
      refreshQueued.current = true;
      return;
    }
    refreshInFlight.current = true;

    try {
      do {
        refreshQueued.current = false;

        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        // If a newer refresh was queued while this request was in flight,
        // discard this potentially stale snapshot and fetch again.
        if (refreshQueued.current) {
          continue;
        }

        if (!payload?.success) {
          setAuthState(null);
          continue;
        }

        const role = normalizeAuthRole(String(payload?.data?.role ?? ""));
        if (!role) {
          setAuthState(null);
          continue;
        }

        let hasPhoto = false;
        if (role === "candidate") {
          const photoResponse = await fetch("/api/candidates/profile-photo", {
            credentials: "include",
            cache: "no-store",
          }).catch(() => null);
          const photoPayload = photoResponse ? await photoResponse.json().catch(() => null) : null;
          hasPhoto = Boolean(photoPayload?.success && photoPayload?.data?.hasPhoto);
        }

        if (refreshQueued.current) {
          continue;
        }

        setAuthState({
          role,
          displayName: payload?.data?.displayName ?? null,
          hasPhoto,
        });
      } while (refreshQueued.current);
    } catch {
      setAuthState(null);
    } finally {
      setResolved(true);
      refreshInFlight.current = false;
    }
  }

  useEffect(() => {
    void refreshAuthState();

    const unsubscribe = subscribeAuthSessionChanged(() => {
      void refreshAuthState();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => clearPendingClose();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!menuRootRef.current?.contains(target)) {
        clearPendingClose();
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        clearPendingClose();
        setMenuOpen(false);
        window.requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (mobile) return;
    if (!authState) return;

    // Keep account navigation discoverable on desktop after auth redirects.
    setMenuOpen(true);
  }, [authState, mobile]);

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
    setAuthState(null);
    closeMenu();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  function handleTriggerClick() {
    if (menuOpen) {
      closeMenu();
      return;
    }
    openMenu();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTriggerClick();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu({ focusIndex: 0 });
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const targetIndex = links.length ? links.length : 0;
      openMenu({ focusIndex: targetIndex });
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!menuOpen) return;

    const focusable = getFocusableElements();
    if (!focusable.length) return;

    const activeElement = document.activeElement as HTMLElement | null;
    const activeIndex = activeElement ? focusable.indexOf(activeElement) : -1;

    if (event.key === "Tab") {
      event.preventDefault();
      const nextIndex = event.shiftKey
        ? (activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1)
        : (activeIndex === -1 || activeIndex >= focusable.length - 1 ? 0 : activeIndex + 1);
      focusable[nextIndex]?.focus();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = activeIndex <= 0 ? 1 : activeIndex + 1;
      const bounded = Math.min(nextIndex, focusable.length - 1);
      focusable[bounded]?.focus();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1;
      focusable[nextIndex]?.focus();
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusable[1]?.focus();
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusable[focusable.length - 1]?.focus();
    }
  }

  function handleMenuNavigate() {
    closeMenu();
    onNavigate?.();
  }

  const actionClassName = mobile
    ? primeButtonClasses("secondary") + " w-full"
    : primeButtonClasses("secondary") + " min-h-11 px-4 py-2.5";

  if (!resolved) {
    return <div className={mobile ? "mt-10" : "hidden md:flex"} aria-hidden="true" />;
  }

  if (!authState) {
    return <AuthSegmentedControl mobile={mobile} onNavigate={onNavigate} />;
  }

  const accountTitle = authState.displayName || t("account");
  const initials = accountTitle
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "PG";

  const candidateLinks = [
    { href: getDashboardHref("candidate"), label: t("dashboard") },
    { href: getAccountHref("candidate"), label: t("careerProfile") },
    { href: "/candidate/applications", label: t("applications") },
    { href: "/candidate/my-interviews", label: t("interviews") },
    { href: "/notifications", label: t("notifications") },
    { href: "/candidate/settings", label: t("settings") },
  ];

  const employerLinks = [
    { href: getDashboardHref("employer"), label: t("dashboard") },
    { href: getAccountHref("employer"), label: t("companyProfile") },
    { href: "/employers/verification", label: t("companyVerification") },
    { href: "/employers/jobs", label: t("jobManagement") },
    { href: "/employers/advertisements", label: t("advertisements") },
    { href: "/employers/candidate-profiles", label: t("candidateProfiles") },
    { href: "/employers/workflow", label: t("workflow") },
    { href: "/employers/interview-center", label: t("interviews") },
    { href: "/employers/supervised-conversations", label: t("supervisedConversations") },
    { href: "/notifications", label: t("notifications") },
    { href: "/employers/settings", label: t("settings") },
  ];

  const staffLinks = [
    { href: getDashboardHref("admin"), label: t("dashboard") },
    { href: getAccountHref("admin"), label: t("account") },
  ];

  const links = authState.role === "candidate" ? candidateLinks : authState.role === "employer" ? employerLinks : staffLinks;

  return (
    <div className={mobile ? "mt-10 flex w-full flex-col gap-3" : "hidden items-center gap-2 md:flex"}>
      <div
        ref={menuRootRef}
        className={mobile ? "rounded-2xl border border-blue-200/20 p-4" : "group relative"}
        onPointerEnter={() => {
          clearPendingClose();
          if (!mobile) {
            openMenu();
          }
        }}
        onPointerLeave={() => {
          scheduleClose();
        }}
        onKeyDown={handleMenuKeyDown}
      >
        <button
          ref={triggerRef}
          type="button"
          className={mobile ? `${actionClassName} justify-start gap-2` : `${primeButtonClasses("secondary")} min-h-11 px-4 py-2.5 gap-2`}
          aria-label={accountTitle}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-expanded={menuOpen}
          onMouseEnter={() => {
            if (!mobile) {
              openMenu();
            }
          }}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
        >
          {authState.role === "candidate" && authState.hasPhoto ? (
            <img
              src="/api/candidates/profile-photo/content"
              alt={t("account")}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-200/30 bg-[#0b1d35] text-[10px] font-semibold text-slate-100">
              {initials}
            </span>
          )}
          <span>{accountTitle}</span>
        </button>

        <div
          id={menuId}
          role="menu"
          className={mobile
            ? `${menuOpen ? "mt-3 flex" : "hidden"} flex-col gap-2`
            : `absolute right-0 top-full z-40 flex w-64 flex-col gap-2 rounded-2xl border border-blue-200/20 bg-[#081326]/95 p-3 shadow-[0_24px_48px_rgba(2,12,25,0.55)] transition-opacity duration-150 ${menuOpen ? "visible opacity-100 pointer-events-auto" : "pointer-events-none invisible opacity-0"}`}
        >
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleMenuNavigate}
              className={`${primeButtonClasses("secondary")} justify-start`}
              ref={(el) => {
                menuItemRefs.current[links.findIndex((link) => link.href === item.href)] = el;
              }}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            ref={(el) => {
              menuItemRefs.current[links.length] = el;
            }}
            className={mobile ? `${actionClassName} border-red-400/30 text-red-100 hover:bg-red-500/10` : "inline-flex min-h-11 items-center justify-start rounded-xl border border-red-400/30 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"}
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </div>
  );
}