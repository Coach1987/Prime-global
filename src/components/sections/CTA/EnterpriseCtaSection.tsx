"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";

export function EnterpriseCtaSection() {
  const t = useTranslations("enterpriseCta");

  return (
    <section className="relative overflow-hidden bg-[#040b13] py-24 md:py-32">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(201,162,75,0.16),transparent_48%)]" />
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="rounded-[32px] border border-gold/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-10 lg:p-12">
          <div className="max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-gold">{t("eyebrow")}</p>
            <h2 className="mt-4 font-heading text-[30px] leading-tight text-text-primary sm:text-[38px]">
              {t("title")}
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-8 text-text-secondary sm:text-base">
              {t("description")}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-[10px] bg-gradient-to-br from-accent-primary to-gold-muted px-7 py-[14px] text-[14px] font-semibold text-charcoal transition-all duration-300 hover:-translate-y-[2px]"
            >
              {t("primaryCta")}
            </Link>
            <button
              type="button"
              onClick={() => smoothScrollTo("services")}
              className="inline-flex items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.03] px-7 py-[14px] text-[14px] font-semibold text-text-primary transition-all duration-300 hover:border-gold/40 hover:bg-gold/[0.08]"
            >
              {t("secondaryCta")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
