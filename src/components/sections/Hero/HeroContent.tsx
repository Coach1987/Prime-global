"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";

export function HeroContent() {
  const t = useTranslations("hero");

  return (
    <div className="w-full max-w-2xl text-center md:text-start">
      {/* Eyebrow */}
      <div
        className="mb-5 inline-flex animate-fade-up items-center gap-3 opacity-0"
        style={{ animationDelay: "0.1s" }}
      >
        <span
          aria-hidden="true"
          className="h-px w-8 bg-gradient-to-r from-transparent to-blue-400/90 md:from-blue-400/90 md:to-transparent"
        />

        <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-300 sm:text-[13px]">
          {t("eyebrow")}
        </span>

        <span
          aria-hidden="true"
          className="h-px w-8 bg-gradient-to-l from-transparent to-blue-400/90 md:hidden"
        />
      </div>

      {/* Main headline */}
      <h1
        className="animate-fade-up font-heading text-[40px] leading-[1.05] tracking-[-0.025em] text-white opacity-0 sm:text-[52px] md:text-[62px] lg:text-[72px]"
        style={{ animationDelay: "0.2s" }}
      >
        <span className="block">
          {t("headlineLine1")} {t("headlineLine2")}
        </span>

        <span className="mt-1 block bg-gradient-to-r from-white via-slate-200 to-blue-300 bg-clip-text text-transparent">
          {t("headlineLine3")}
        </span>
      </h1>

      {/* Accent line */}
      <div
        className="mx-auto mt-7 h-px w-24 animate-fade-up bg-gradient-to-r from-transparent via-blue-400/80 to-transparent opacity-0 md:mx-0 md:bg-gradient-to-r md:from-blue-400/90 md:via-blue-300/40 md:to-transparent"
        style={{ animationDelay: "0.26s" }}
      />

      {/* Supporting copy */}
      <p
        className="mx-auto mt-7 max-w-xl animate-fade-up text-[15px] leading-7 text-slate-300/85 opacity-0 sm:text-base md:mx-0 md:text-[17px] md:leading-8"
        style={{ animationDelay: "0.32s" }}
      >
        {t("subtext")}
      </p>

      {/* CTA buttons */}
      <div
        className="mt-9 flex animate-fade-up flex-col items-center gap-3 opacity-0 sm:flex-row sm:justify-center md:justify-start"
        style={{ animationDelay: "0.42s" }}
      >
        <Link
          href="/services"
          className="group relative inline-flex min-h-[52px] w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-blue-300/40 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_36px_rgba(30,120,255,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(30,120,255,0.42)] active:translate-y-0 active:scale-[0.98] sm:w-auto"
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
          className="group inline-flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.035] px-8 py-3.5 text-[15px] font-semibold text-slate-100 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/50 hover:bg-blue-400/[0.07] hover:shadow-[0_14px_36px_rgba(20,90,180,0.18)] active:translate-y-0 active:scale-[0.98] sm:w-auto"
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

      {/* Trust note */}
      <div
        className="mt-6 flex animate-fade-up items-center justify-center gap-2 text-xs text-slate-400 opacity-0 md:justify-start"
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
