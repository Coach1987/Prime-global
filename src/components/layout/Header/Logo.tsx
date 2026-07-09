"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

interface LogoProps {
  scrolled: boolean;
}

/**
 * Header logo. Uses the real Prime Global logo artwork (cropped to just
 * the globe/ring/arrow mark, from the same source file as the Hero's
 * full lockup) — not a recreation. At header scale (~32-36px) the full
 * square lockup's wordmark would be illegibly small, so the mark image
 * is paired with a plain text wordmark beside it, matching standard
 * practice for compact header logos (icon + text, full lockup reserved
 * for larger placements like the Hero).
 */
export function Logo({ scrolled }: LogoProps) {
  const t = useTranslations("nav");

  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 shrink-0"
      aria-label={t("homeLabel")}
    >
      {/* Real logo mark artwork */}
      <span
        className={cn(
          "relative shrink-0 transition-all duration-300 ease-premium-out",
          scrolled ? "h-9 w-9" : "h-10 w-10"
        )}
      >
        <Image
          src="/images/logo/prime-global-mark.png"
          alt=""
          fill
          sizes="40px"
          className="object-contain drop-shadow-[0_0_10px_rgba(201,162,75,0.4)]"
        />
      </span>

      {/* Wordmark */}
      <span
        className={cn(
          "font-heading tracking-tight transition-all duration-300 ease-premium-out",
          scrolled ? "text-[15px]" : "text-[17px]"
        )}
      >
        <span className="bg-gradient-to-b from-metallic-1 to-metallic-2 bg-clip-text text-transparent">
          PRIME
        </span>{" "}
        <span className="text-accent-primary">GLOBAL</span>
      </span>
    </Link>
  );
}
