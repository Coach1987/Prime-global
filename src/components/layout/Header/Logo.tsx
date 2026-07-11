"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  scrolled: boolean;
}

export function Logo({ scrolled }: LogoProps) {
  const t = useTranslations("nav");

  return (
    <Link
      href="/"
      aria-label={t("homeLabel")}
      className="group flex shrink-0 items-center gap-3"
    >
      {/* Prime Global mark */}
      <span
        className={cn(
          "relative shrink-0 transition-all duration-500",
          scrolled ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-blue-400/10 blur-xl transition-all duration-500 group-hover:bg-blue-300/20"
        />

        <Image
          src="/images/logo/prime-global-mark.png"
          alt=""
          fill
          priority
          sizes="48px"
          className="relative object-contain drop-shadow-[0_0_14px_rgba(75,160,255,0.32)] transition-transform duration-500 group-hover:scale-105"
        />
      </span>

      {/* Wordmark */}
      <span
        className={cn(
          "flex items-baseline gap-1 font-heading transition-all duration-500",
          scrolled ? "text-[16px]" : "text-[18px]"
        )}
      >
        <span className="bg-gradient-to-b from-white via-slate-200 to-slate-500 bg-clip-text font-semibold tracking-[0.02em] text-transparent">
          PRIME
        </span>

        <span className="bg-gradient-to-b from-blue-200 via-blue-400 to-blue-600 bg-clip-text font-semibold tracking-[0.08em] text-transparent">
          GLOBAL
        </span>
      </span>
    </Link>
  );
}
