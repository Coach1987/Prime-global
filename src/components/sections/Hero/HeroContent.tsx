"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";

export function HeroContent() {
  const t = useTranslations("hero");

  return (
    <div className="max-w-xl text-center md:text-start">
      {/* Eyebrow */}
      <div
        className="mb-5 inline-flex animate-fade-up items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-gold opacity-0"
        style={{ animationDelay: "0.1s" }}
      >
        <span className="h-1 w-1 rounded-full bg-gold" />
        {t("eyebrow")}
      </div>

      {/* Headline */}
      <h1
        className="animate-fade-up font-heading text-[36px] leading-[1.15] text-text-primary opacity-0 sm:text-5xl md:text-[58px]"
        style={{ animationDelay: "0.2s" }}
      >
        {t("headlineLine1")}{" "}
        <span className="bg-gradient-to-b from-gold-bright via-gold to-gold-muted bg-clip-text text-transparent">
          {t("headlineLine2")}
        </span>{" "}
        {t("headlineLine3")}
      </h1>

      {/* Subtext */}
      <p
        className="mx-auto mt-6 max-w-md animate-fade-up text-base leading-[1.7] text-text-secondary opacity-0 md:mx-0 md:text-lg"
        style={{ animationDelay: "0.3s" }}
      >
        {t("subtext")}
      </p>

      {/* CTA buttons */}
      <div
        className="mt-9 flex animate-fade-up flex-col items-center gap-4 opacity-0 sm:flex-row md:items-start"
        style={{ animationDelay: "0.4s" }}
      >
        <Link
          href="/services"
          className="inline-flex w-full items-center justify-center rounded-[10px] bg-gradient-to-br from-accent-primary to-gold-muted px-8 py-[14px] text-[15px] font-semibold text-charcoal shadow-[0_4px_20px_rgba(201,162,75,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(201,162,75,0.5)] hover:brightness-110 active:scale-[0.98] sm:w-auto"
        >
          {t("ctaPrimary")}
        </Link>

        <button
          type="button"
          onClick={() => smoothScrollTo("contact")}
          className="inline-flex w-full items-center justify-center rounded-[10px] border-[1.5px] border-white/20 px-8 py-[14px] text-[15px] font-semibold text-text-primary transition-colors duration-200 hover:border-gold hover:bg-gold/[0.08] sm:w-auto"
        >
          {t("ctaSecondary")}
        </button>
      </div>
    </div>
  );
}
