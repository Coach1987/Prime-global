"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";

export function HeroContent() {
  const t = useTranslations("hero");

  return (
    <div className="w-full max-w-[620px] text-center md:text-start">
      <div
        className="mb-4 inline-flex animate-fade-up items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 opacity-0 shadow-[0_8px_30px_rgba(3,8,20,0.2)] backdrop-blur-xl sm:mb-5"
        style={{ animationDelay: "0.1s" }}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(201,162,75,0.8)]"
        />

        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-200/90 sm:text-[12px]">
          {t("eyebrow")}
        </span>
      </div>

      <h1
        className="animate-fade-up font-heading text-[38px] leading-[0.95] tracking-[-0.025em] text-white opacity-0 sm:text-[48px] md:text-[58px] lg:text-[68px]"
        style={{ animationDelay: "0.2s" }}
      >
        <span className="block max-w-[10ch] sm:max-w-none">
          {t("headlineLine1")} {t("headlineLine2")}
        </span>

        <span className="mt-1 block bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent">
          {t("headlineLine3")}
        </span>
      </h1>

      <div
        className="mx-auto mt-6 h-px w-20 animate-fade-up bg-gradient-to-r from-transparent via-blue-400/80 to-transparent opacity-0 md:mx-0 md:w-24"
        style={{ animationDelay: "0.26s" }}
      />

      <p
        className="mx-auto mt-6 max-w-[560px] animate-fade-up text-[15px] leading-7 text-slate-300/85 opacity-0 sm:text-base md:mx-0 md:text-[17px] md:leading-8"
        style={{ animationDelay: "0.32s" }}
      >
        {t("subtext")}
      </p>

      <div
        className="mt-8 flex animate-fade-up flex-col items-center gap-3 opacity-0 sm:flex-row sm:justify-center md:justify-start"
        style={{ animationDelay: "0.42s" }}
      >
        <Link
          href="/services"
          className="group relative inline-flex min-h-[52px] w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-gold/35 bg-gradient-to-r from-[#C9A24B] via-[#D9B86B] to-[#A77F2F] px-7 py-3.5 text-[15px] font-semibold text-[#07111D] shadow-[0_16px_42px_rgba(201,162,75,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(201,162,75,0.32)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030814] sm:w-auto"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />

          <span className="relative z-10">{t("ctaPrimary")}</span>

          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
            aria-hidden="true"
          >
            <path
              d="M2.5 8h11M9 3.5 13.5 8 9 12.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => smoothScrollTo("contact")}
          className="group inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/[0.035] px-7 py-3.5 text-[15px] font-semibold text-slate-100 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/50 hover:bg-blue-400/[0.08] hover:shadow-[0_14px_36px_rgba(20,90,180,0.18)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030814] sm:w-auto"
        >
          <span>{t("ctaSecondary")}</span>

          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="opacity-50 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 rtl:rotate-180 rtl:group-hover:-translate-x-1"
            aria-hidden="true"
          >
            <path
              d="M2.5 8h11M9 3.5 13.5 8 9 12.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        className="mt-6 flex animate-fade-up items-center justify-center gap-2 text-[12px] text-slate-400 opacity-0 md:justify-start"
        style={{ animationDelay: "0.5s" }}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.9)]"
        />

        <span>Prime Global · Development · Logistics · Recruitment</span>
      </div>
    </div>
  );
}
