"use client";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type AuthSegmentedControlProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export function AuthSegmentedControl({ mobile = false, onNavigate }: AuthSegmentedControlProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [registerMode, setRegisterMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRegisterMode(params.get("mode") === "register");
  }, [pathname]);

  const isAuthRoute = pathname.endsWith("/auth");

  const signInActive = isAuthRoute && !registerMode;
  const registerActive = isAuthRoute && registerMode;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full border border-blue-200/30 bg-[linear-gradient(140deg,rgba(9,24,46,0.92),rgba(6,17,34,0.9))] p-[3px]",
        "shadow-[inset_0_1px_0_rgba(215,233,255,0.12),0_0_0_1px_rgba(121,179,245,0.18),0_16px_34px_rgba(4,21,48,0.5)]",
        mobile ? "mt-10 flex w-full" : "hidden items-center md:flex"
      )}
    >
      <Link
        href="/auth"
        onClick={onNavigate}
        className={cn(
          "relative z-10 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold tracking-[0.01em] transition-all duration-500 ease-premium-out",
          mobile ? "flex-1" : "min-w-[104px]",
          signInActive
            ? "bg-gradient-to-b from-[#67c2ff] via-[#2d8ef7] to-[#0a5abc] text-[#edf5ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_1px_rgba(181,220,255,0.34),0_0_22px_rgba(68,149,255,0.5)]"
            : "text-slate-300 hover:text-slate-100 hover:bg-white/[0.035]"
        )}
      >
        {t("signIn")}
      </Link>
      <span className="my-2 w-px bg-gradient-to-b from-blue-200/10 via-blue-200/55 to-blue-200/10" />
      <Link
        href="/auth?mode=register"
        onClick={onNavigate}
        className={cn(
          "relative z-10 inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold tracking-[0.01em] transition-all duration-500 ease-premium-out",
          mobile ? "flex-1" : "min-w-[132px]",
          registerActive
            ? "bg-gradient-to-b from-[#67c2ff] via-[#2d8ef7] to-[#0a5abc] text-[#edf5ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_1px_rgba(181,220,255,0.34),0_0_22px_rgba(68,149,255,0.5)]"
            : "text-slate-300 hover:text-slate-100 hover:bg-white/[0.035]"
        )}
      >
        {t("createAccount")}
      </Link>
    </div>
  );
}
