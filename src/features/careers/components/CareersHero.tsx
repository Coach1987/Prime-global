"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function CareersHero() {
  const t = useTranslations("careers.hero");

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(12,24,41,0.94),rgba(8,16,29,0.96))] px-6 py-12 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:px-10 sm:py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(130,192,255,0.16),transparent_42%),radial-gradient(circle_at_86%_16%,rgba(96,166,255,0.14),transparent_35%)]"
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/90">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue-300" />
          {t("eyebrow")}
        </p>

        <h1 className="font-heading text-[34px] leading-[1.08] tracking-[-0.02em] text-white sm:text-[46px] md:text-[58px]">
          {t("title")}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-slate-300 sm:text-[17px] sm:leading-8">
          {t("subtitle")}
        </p>

        <div className="mt-8">
          <Link
            href="/careers/apply"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-blue-100/45 bg-gradient-to-r from-[#2a85eb] via-[#4fa8ff] to-[#1d66c8] px-8 py-3 text-[15px] font-semibold text-white shadow-[0_18px_48px_rgba(67,149,246,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(76,159,255,0.36)]"
          >
            {t("cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}