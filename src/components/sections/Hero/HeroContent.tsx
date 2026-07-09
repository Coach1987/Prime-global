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
        className="mb-6 inline-flex animate-fade-up items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-gold opacity-0"
        style={{ animationDelay: "0.1s" }}
      >
        <span className="h-1 w-1 rounded-full bg-gold" />
        {t("eyebrow")}
      </div>

      {/* Headline — plain warm-cream serif, per reference; gold is reserved
          for the eyebrow, rule, and CTAs so it reads as a rare accent
          rather than a competing focal point. */}
      <h1
        className="animate-fade-up font-heading text-[38px] leading-[1.12] tracking-[-0.01em] text-text-primary opacity-0 sm:text-5xl md:text-[62px]"
        style={{ animationDelay: "0.2s" }}
      >
        {t("headlineLine1")} {t("headlineLine2")}
        <br className="hidden sm:block" /> {t("headlineLine3")}
      </h1>

      {/* Thin gold rule beneath the headline — quiet, cinematic divider */}
      <div
        className="mx-auto mt-7 h-px w-16 animate-fade-up bg-gradient-to-r from-gold/80 to-transparent opacity-0 md:mx-0"
        style={{ animationDelay: "0.25s" }}
      />

      {/* Subtext — more breathing room above/below for calmer vertical rhythm */}
      <p
        className="mx-auto mt-8 max-w-md animate-fade-up text-base leading-[1.7] text-text-secondary opacity-0 md:mx-0 md:text-lg"
        style={{ animationDelay: "0.3s" }}
      >
        {t("subtext")}
      </p>

      {/* CTA buttons */}
      <div
        className="mt-11 flex animate-fade-up flex-col items-center gap-4 opacity-0 sm:flex-row md:items-start"
        style={{ animationDelay: "0.4s" }}
      >
        <Link
          href="/services"
          className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-[10px] bg-gradient-to-br from-accent-primary to-gold-muted px-8 py-[15px] text-[15px] font-semibold tracking-[0.01em] text-charcoal shadow-[0_4px_20px_rgba(201,162,75,0.35)] transition-all duration-300 ease-out hover:-translate-y-[3px] hover:shadow-[0_10px_36px_rgba(201,162,75,0.55)] active:scale-[0.98] active:translate-y-0 sm:w-auto"
        >
          {/* Light-sweep on hover — premium, understated shine rather than a color change */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
          />
          <span className="relative">{t("ctaPrimary")}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="relative rtl:rotate-180 transition-transform duration-300 ease-out group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
            aria-hidden="true"
          >
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => smoothScrollTo("contact")}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-white/20 bg-white/[0.02] px-8 py-[15px] text-[15px] font-semibold tracking-[0.01em] text-text-primary backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-[3px] hover:border-gold hover:bg-gold/[0.08] hover:shadow-[0_10px_28px_rgba(201,162,75,0.18)] active:scale-[0.98] active:translate-y-0 sm:w-auto"
        >
          {t("ctaSecondary")}
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="rtl:rotate-180 opacity-0 -translate-x-1 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 rtl:group-hover:rotate-180"
            aria-hidden="true"
          >
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
