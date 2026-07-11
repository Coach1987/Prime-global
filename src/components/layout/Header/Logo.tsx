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
      className="group relative flex shrink-0 items-center md:-translate-y-[2px]"
    >
      <span className="relative h-[54px] w-[202px] sm:h-[56px] sm:w-[210px] md:hidden">
        <Image
          src="/images/logo/prime-global-logo-clean.png"
          alt="Prime Global"
          fill
          priority
          quality={100}
          sizes="210px"
          className="object-contain object-left-center drop-shadow-[0_0_18px_rgba(89,166,255,0.28)] transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </span>

      <span
        className={
          scrolled
            ? "relative hidden h-[52px] w-[214px] md:block md:h-[54px] md:w-[222px]"
            : "relative hidden h-[58px] w-[236px] md:block md:h-[62px] md:w-[248px]"
        }
      >
        <Image
          src="/images/logo/prime-global-logo-clean.png"
          alt="Prime Global"
          fill
          priority
          sizes="(max-width: 430px) 214px, 248px"
          className="object-contain object-left-center drop-shadow-[0_0_18px_rgba(89,166,255,0.28)] transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </span>
    </Link>
  );
}
