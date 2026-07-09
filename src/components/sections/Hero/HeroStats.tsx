"use client";

import { useTranslations } from "next-intl";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const STAT_KEYS = ["experience", "clients", "industries", "satisfaction"] as const;

/**
 * Splits a translated stat string like "10+", "+150", "98%", or "٪98"
 * into its numeric core plus whatever leads/trails it, so the digits can
 * be count-up animated while the locale's own symbol placement (Arabic
 * puts "+"/"٪" before the number) is preserved exactly as translated.
 * Falls back to rendering the raw string with no animation if no digit
 * run is found, so this can never produce broken output.
 */
function parseStat(raw: string) {
  const match = raw.match(/\d+/);
  if (!match) return { prefix: "", value: null as number | null, suffix: raw };
  const digits = match[0];
  const start = raw.indexOf(digits);
  return {
    prefix: raw.slice(0, start),
    value: parseInt(digits, 10),
    suffix: raw.slice(start + digits.length),
  };
}

export function HeroStats() {
  const t = useTranslations("hero.stats");

  return (
    <div
      className="mt-16 w-full max-w-xl animate-fade-up rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-6 opacity-0 backdrop-blur-xl sm:px-8 sm:py-7 md:w-auto"
      style={{ animationDelay: "0.55s" }}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:flex sm:flex-wrap sm:items-stretch sm:justify-center sm:gap-0 md:justify-start">
        {STAT_KEYS.map((key, i) => {
          const { prefix, value, suffix } = parseStat(t(`${key}.value`));
          return (
            <div key={key} className="flex items-center gap-6 sm:gap-0">
              {i > 0 && (
                <span
                  className="hidden h-10 w-px shrink-0 bg-white/10 sm:mx-6 sm:block"
                  aria-hidden="true"
                />
              )}
              <div className="flex flex-col items-center text-center sm:items-start sm:text-start">
                <span className="font-heading text-3xl text-gold sm:text-4xl">
                  {value === null ? (
                    suffix
                  ) : (
                    <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
                  )}
                </span>
                <span className="mt-1 text-[13px] leading-snug text-text-tertiary">
                  {t(`${key}.label`)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
