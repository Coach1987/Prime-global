"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FeatureCard } from "./FeatureCard";
import { WHY_US_ITEMS } from "@/lib/constants/whyUs";

export function WhyUsSection() {
  const t = useTranslations("whyUs");
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !rowRef.current) return;

    const cards = rowRef.current.querySelectorAll("[data-feature-card]");
    const icons = rowRef.current.querySelectorAll("[data-feature-icon]");

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rowRef.current,
          start: "top 80%",
          once: true,
        },
      });

      tl.fromTo(
        cards,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.12 }
      ).fromTo(
        icons,
        { opacity: 0, scale: 0.6, rotate: -8 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.7)", stagger: 0.12 },
        "-=0.35"
      );
    }, rowRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative bg-bg-primary py-16 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <div
          ref={rowRef}
          className="mt-14 flex flex-col gap-12 md:mt-20 md:flex-row md:items-stretch md:gap-6"
        >
          {WHY_US_ITEMS.map((item, index) => (
            <div key={item.key} data-feature-card className="flex flex-1 opacity-100">
              <FeatureCard item={item} showDivider={index > 0} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
