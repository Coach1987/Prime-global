"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceCard } from "./ServiceCard";
import { SERVICES } from "@/lib/constants/services";

export function ServicesSection() {
  const t = useTranslations("services");
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll<HTMLElement>(
      "[data-service-card]"
    );

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 48,
          scale: 0.96,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 82%",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative isolate overflow-hidden bg-[#030814] py-20 md:py-28 lg:py-36"
    >
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#02060d_0%,#06101d_45%,#030814_100%)]" />

        <div className="absolute left-1/2 top-0 h-px w-[72%] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />

        <div className="absolute -left-48 top-24 h-[460px] w-[460px] rounded-full bg-blue-600/[0.08] blur-[150px]" />

        <div className="absolute -right-52 bottom-10 h-[520px] w-[520px] rounded-full bg-cyan-400/[0.06] blur-[170px]" />

        <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] bg-[size:72px_72px]" />
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
          ref={gridRef}
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
