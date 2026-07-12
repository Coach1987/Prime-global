"use client";

import { useTranslations } from "next-intl";

const INFO_KEYS = ["whyPrimeGlobal", "benefits", "process", "international", "growth", "workforce"] as const;

export function CareersInfoSections() {
  const t = useTranslations("careers.info");

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="careers-info-heading">
      <div className="mb-8 text-center sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/90">{t("eyebrow")}</p>
        <h2 id="careers-info-heading" className="mt-3 font-heading text-[30px] text-white sm:text-[40px]">
          {t("title")}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INFO_KEYS.map((key) => (
          <article
            key={key}
            className="rounded-2xl border border-white/10 bg-[#0f1828]/75 p-6 shadow-[0_12px_40px_rgba(1,8,18,0.35)]"
          >
            <h3 className="font-heading text-2xl leading-tight text-white">{t(`${key}.title`)}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{t(`${key}.description`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}