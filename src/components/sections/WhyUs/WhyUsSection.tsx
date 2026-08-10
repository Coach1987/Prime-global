"use client";

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "./FeatureCard";
import { WHY_US_ITEMS } from "@/lib/constants/whyUs";

export function WhyUsSection() {
  const t = useTranslations("whyUs");

  return (
    <section
      className="relative z-10 isolate overflow-hidden bg-transparent py-24 md:py-36"
    >
      {/* Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,11,22,0.28)_0%,rgba(7,19,32,0.12)_45%,rgba(3,8,20,0.34)_100%)]" />

        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />

        <div className="absolute left-[-220px] top-10 h-[520px] w-[520px] rounded-full bg-blue-500/[0.08] blur-[170px]" />

        <div className="absolute right-[-240px] bottom-0 h-[560px] w-[560px] rounded-full bg-cyan-400/[0.06] blur-[180px]" />
      </div>

      <div className="mx-auto max-w-[1380px] px-5 md:px-10">

        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        <div
          data-home-stagger
          className="mt-16 grid gap-6 md:mt-20 md:grid-cols-3"
        >
          {WHY_US_ITEMS.map((item) => (
            <div
              key={item.key}
              data-feature-card
              className="h-full"
            >
              <FeatureCard
                item={item}
                showDivider={false}
              />
            </div>
          ))}
        </div>

        <div className="mt-16 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-500">
          <span className="h-px w-10 bg-blue-400/30" />
          <span>Built for long-term partnerships</span>
          <span className="h-px w-10 bg-blue-400/30" />
        </div>

      </div>
    </section>
  );
}
