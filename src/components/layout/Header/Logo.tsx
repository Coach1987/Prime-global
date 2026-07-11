"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface LogoProps {
  scrolled: boolean;
}

export function Logo({ scrolled }: LogoProps) {
  const t = useTranslations("nav");

  return (
    <Link
      href="/"
      aria-label={t("homeLabel")}
      className="group relative flex shrink-0 items-center"
    >
      <span
        className={
          scrolled
            ? "relative h-[44px] w-[132px] sm:h-[46px] sm:w-[138px]"
            : "relative h-[48px] w-[142px] sm:h-[52px] sm:w-[152px]"
        }
      >
        <Image
          src="/images/logo/prime-global-mark.png"
          alt="Prime Global"
          fill
          priority
          sizes="(max-width: 430px) 132px, 152px"
          className="object-contain drop-shadow-[0_0_16px_rgba(89,166,255,0.26)] transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </span>
    </Link>
  );
}
