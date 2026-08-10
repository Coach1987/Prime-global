"use client";

import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "./ServiceCard";
import { SERVICES } from "@/lib/constants/services";

export function ServicesSection() {
  const t = useTranslations("services");
  return (
    <section
      id="services"
      className="relative z-10 isolate overflow-hidden bg-transparent py-20 md:py-28 lg:py-36"
    >
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,13,0.24)_0%,rgba(6,16,29,0.12)_45%,rgba(3,8,20,0.32)_100%)]" />

        <div className="absolute left-1/2 top-0 h-px w-[72%] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />

        <div className="absolute -left-48 top-24 h-[460px] w-[460px] rounded-full bg-blue-600/[0.09] blur-[150px]" />

        <div className="absolute -right-52 bottom-10 h-[520px] w-[520px] rounded-full bg-cyan-400/[0.07] blur-[170px]" />

        <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-6 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        {/* Premium section divider */}
        <div
          aria-hidden="true"
          className="mx-auto mt-8 flex max-w-md items-center gap-4"
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-400/35" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(125,211,252,0.8)]" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-400/35" />
        </div>

        <div
          data-home-stagger
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 md:mt-16 md:gap-6 lg:grid-cols-2"
        >
          {SERVICES.map((service, index) => (
            <div
              key={service.slug}
              data-service-card
              className="h-full will-change-transform"
            >
              <ServiceCard service={service} index={index} />
            </div>
          ))}
        </div>

        {/* Bottom trust line */}
        <div className="mt-12 flex items-center justify-center gap-3 text-center text-xs uppercase tracking-[0.22em] text-slate-500 md:mt-16">
          <span className="h-px w-8 bg-blue-400/30" />
          <span>Integrated solutions. Global standards.</span>
          <span className="h-px w-8 bg-blue-400/30" />
        </div>
      </div>
    </section>
  );
}
