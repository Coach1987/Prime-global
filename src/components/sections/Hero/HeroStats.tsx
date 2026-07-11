"use client";

import { useTranslations } from "next-intl";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const STAT_KEYS = ["experience", "clients", "industries", "satisfaction"] as const;

function parseStat(raw: string) {
  const match = raw.match(/\d+/);

  if (!match) {
    return {
      prefix: "",
      value: null as number | null,
      suffix: raw,
    };
  }

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
      className="mt-10 w-full max-w-2xl animate-fade-up rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-6 backdrop-blur-2xl opacity-0 sm:px-8 sm:py-7 md:w-auto"
      style={{ animationDelay: "0.55s" }}
    >
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {STAT_KEYS.map((key) => {
          const { prefix, value, suffix } = parseStat(t(`${key}.value`));

          return (
            <div key={key} className="text-center">
              <div className="bg-gradient-to-b from-white via-slate-200 to-blue-300 bg-clip-text text-[34px] font-bold text-transparent">
                {value === null ? (
                  suffix
                ) : (
                  <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
                )}
              </div>

              <div className="mt-2 text-sm tracking-wide text-slate-400">
                {t(`${key}.label`)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
