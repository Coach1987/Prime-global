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
        "relative overflow-hidden rounded-full border border-blue-200/35 bg-[#07162b] p-1",
        "shadow-[0_0_0_1px_rgba(142,198,255,0.2),0_14px_30px_rgba(6,33,74,0.52)]",
        mobile ? "mt-10 flex w-full" : "hidden items-center md:flex"
      )}
    >
      <Link
        href="/auth"
        onClick={onNavigate}
        className={cn(
          "relative z-10 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-all duration-300",
          mobile ? "flex-1" : "min-w-[104px]",
          signInActive
            ? "bg-gradient-to-b from-[#6EC8FF] via-[#2E8FFF] to-[#0B5FC7] text-[#ecf6ff] shadow-[0_0_0_1px_rgba(187,223,255,0.4),0_0_22px_rgba(77,162,255,0.5)]"
            : "text-slate-300 hover:text-slate-100"
        )}
      >
        {t("signIn")}
      </Link>
      <span className="my-1 w-px bg-gradient-to-b from-blue-200/25 via-blue-200/70 to-blue-200/25" />
      <Link
        href="/auth?mode=register"
        onClick={onNavigate}
        className={cn(
          "relative z-10 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition-all duration-300",
          mobile ? "flex-1" : "min-w-[132px]",
          registerActive
            ? "bg-gradient-to-b from-[#6EC8FF] via-[#2E8FFF] to-[#0B5FC7] text-[#ecf6ff] shadow-[0_0_0_1px_rgba(187,223,255,0.4),0_0_22px_rgba(77,162,255,0.5)]"
            : "text-slate-300 hover:text-slate-100"
        )}
      >
        {t("createAccount")}
      </Link>
    </div>
  );
}
