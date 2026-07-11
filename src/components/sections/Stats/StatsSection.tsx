"use client";

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const STAT_KEYS = ["experience", "clients", "industries", "satisfaction"] as const;

function parseStat(raw: string) {
  const match = raw.match(/\d+/);
  if (!match) return { prefix: "", value: null as number | null, suffix: raw };
  const digits = match[0];
  const start = raw.indexOf(digits);
  return {
    prefix: raw.slice(0, start),
    value: Number.parseInt(digits, 10),
    suffix: raw.slice(start + digits.length),
  };
}

export function StatsSection() {
  const t = useTranslations("statsSection");
  const heroStats = useTranslations("hero.stats");

  return (
    <section id="stats" className="relative overflow-hidden bg-[#040914] py-24 md:py-36">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(201,162,75,0.12),transparent_40%)]" />

      <div className="mx-auto max-w-[1380px] px-5 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        <div className="mt-14 grid gap-5 md:mt-16 md:grid-cols-2 xl:grid-cols-4">
          {STAT_KEYS.map((key) => {
            const { prefix, value, suffix } = parseStat(heroStats(`${key}.value`));
            return (
              <div
                key={key}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_18px_45px_rgba(0,0,0,0.2)] backdrop-blur-xl"
              >
                <div className="font-heading text-4xl text-gold sm:text-5xl">
                  {value === null ? (
                    suffix
                  ) : (
                    <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
                  )}
                </div>
                <p className="mt-3 text-[15px] leading-7 text-text-secondary">
                  {heroStats(`${key}.label`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
