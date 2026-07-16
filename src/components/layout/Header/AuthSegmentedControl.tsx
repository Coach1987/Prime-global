"use client";

import { usePathname } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type AuthSegmentedControlProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AuthSegmentedControl({ mobile = false, onNavigate }: AuthSegmentedControlProps) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const [registerMode, setRegisterMode] = useState(false);
  const signInRef = useRef<HTMLButtonElement>(null);
  const createAccountRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function syncModeFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setRegisterMode(params.get("mode") === "register");
    }

    syncModeFromUrl();
    window.addEventListener("popstate", syncModeFromUrl);

    return () => window.removeEventListener("popstate", syncModeFromUrl);
  }, [pathname]);

  const isAuthRoute = pathname.endsWith("/auth");
  const activeIndex = isAuthRoute && registerMode ? 1 : 0;

  function activateSegment(index: 0 | 1) {
    if (index === 0) {
      setRegisterMode(false);
      onNavigate?.();
      router.push("/auth");
      return;
    }

    setRegisterMode(true);
    onNavigate?.();
    router.push("/auth?mode=register");
  }

  function focusSegment(index: 0 | 1) {
    const ref = index === 0 ? signInRef : createAccountRef;
    requestAnimationFrame(() => ref.current?.focus());
  }

  function handleArrowNavigation(current: 0 | 1) {
    const nextIndex: 0 | 1 = current === 0 ? 1 : 0;
    activateSegment(nextIndex);
    focusSegment(nextIndex);
  }

  function handleSegmentKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: 0 | 1) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      handleArrowNavigation(index);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handleArrowNavigation(index);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateSegment(index);
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-blue-200/30 bg-[linear-gradient(140deg,rgba(9,24,46,0.92),rgba(6,17,34,0.9))] p-[3px]",
        "shadow-[inset_0_1px_0_rgba(215,233,255,0.12),0_0_0_1px_rgba(121,179,245,0.18),0_16px_34px_rgba(4,21,48,0.5)]",
        "focus-within:ring-2 focus-within:ring-blue-300/55 focus-within:ring-offset-2 focus-within:ring-offset-[#07152a]",
        mobile ? "mt-10 flex w-full" : "hidden items-center md:flex"
      )}
      role="tablist"
      aria-label={t("signIn") + " / " + t("createAccount")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-[3px] left-[3px] top-[3px] z-0 rounded-full border border-blue-100/45",
          "bg-gradient-to-b from-[#67c2ff] via-[#2d8ef7] to-[#0a5abc]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_1px_rgba(181,220,255,0.34),0_0_22px_rgba(68,149,255,0.5)]",
          "w-[calc(50%-3px)] transform-gpu transition-transform duration-[280ms] ease-in-out will-change-transform",
          activeIndex === 1 ? "translate-x-full" : "translate-x-0"
        )}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-2 left-1/2 z-10 w-px bg-gradient-to-b from-blue-200/10 via-blue-200/55 to-blue-200/10"
      />

      <button
        ref={signInRef}
        type="button"
        role="tab"
        aria-selected={activeIndex === 0}
        tabIndex={activeIndex === 0 ? 0 : -1}
        onClick={() => activateSegment(0)}
        onKeyDown={(event) => handleSegmentKeyDown(event, 0)}
        className={cn(
          "relative z-20 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold tracking-[0.01em]",
          "cursor-pointer select-none [caret-color:transparent] transition-colors duration-300 ease-in-out",
          "focus:outline-none",
          mobile ? "flex-1" : "min-w-[104px]",
          activeIndex === 0 ? "text-[#edf5ff]" : "text-slate-300 hover:text-slate-100"
        )}
      >
        <span className="pointer-events-none">{t("signIn")}</span>
      </button>

      <button
        ref={createAccountRef}
        type="button"
        role="tab"
        aria-selected={activeIndex === 1}
        tabIndex={activeIndex === 1 ? 0 : -1}
        onClick={() => activateSegment(1)}
        onKeyDown={(event) => handleSegmentKeyDown(event, 1)}
        className={cn(
          "relative z-20 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold tracking-[0.01em]",
          "cursor-pointer select-none [caret-color:transparent] transition-colors duration-300 ease-in-out",
          "focus:outline-none",
          mobile ? "flex-1" : "min-w-[132px]",
          activeIndex === 1 ? "text-[#edf5ff]" : "text-slate-300 hover:text-slate-100"
        )}
      >
        <span className="pointer-events-none">{t("createAccount")}</span>
      </button>
    </div>
  );
}
