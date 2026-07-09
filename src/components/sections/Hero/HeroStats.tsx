"use client";

import { useTranslations } from "next-intl";

const STAT_KEYS = ["experience", "clients", "industries", "satisfaction"] as const;

export function HeroStats() {
  const t = useTranslations("hero.stats");

  return (
    <div
      className="mt-14 grid animate-fade-up grid-cols-2 gap-x-6 gap-y-8 opacity-0 sm:flex sm:flex-wrap sm:items-stretch sm:justify-center sm:gap-0 md:justify-start"
      style={{ animationDelay: "0.55s" }}
    >
      {STAT_KEYS.map((key, i) => (
        <div
          key={key}
          className="flex items-center gap-6 sm:gap-0"
        >
          {i > 0 && (
            <span
              className="hidden h-10 w-px shrink-0 bg-white/10 sm:mx-6 sm:block"
              aria-hidden="true"
            />
          )}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-start">
            <span className="font-heading text-3xl text-gold sm:text-4xl">
              {t(`${key}.value`)}
            </span>
            <span className="mt-1 text-[13px] leading-snug text-text-tertiary">
              {t(`${key}.label`)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
