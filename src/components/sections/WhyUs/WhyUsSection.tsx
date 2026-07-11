"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "./FeatureCard";
import { WHY_US_ITEMS } from "@/lib/constants/whyUs";

export function WhyUsSection() {
  const t = useTranslations("whyUs");

  const sectionRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !rowRef.current) return;

    const cards =
      rowRef.current.querySelectorAll<HTMLElement>(
        "[data-feature-card]"
      );

    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 50,
          scale: 0.96,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: {
            trigger: rowRef.current,
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
      className="relative isolate overflow-hidden bg-[#040b16] py-24 md:py-36"
    >
      {/* Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#040b16_0%,#071320_45%,#030814_100%)]" />

        <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />

        <div className="absolute left-[-220px] top-10 h-[520px] w-[520px] rounded-full bg-blue-500/[0.06] blur-[170px]" />

        <div className="absolute right-[-240px] bottom-0 h-[560px] w-[560px] rounded-full bg-cyan-400/[0.05] blur-[180px]" />
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
          ref={rowRef}
          className="mt-16 grid gap-6 md:mt-20 md:grid-cols-3"
        >
          {WHY_US_ITEMS.map((item, index) => (
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
