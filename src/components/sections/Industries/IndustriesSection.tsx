"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

const INDUSTRY_KEYS = ["operations", "talent", "logistics", "strategy"] as const;

export function IndustriesSection() {
  const t = useTranslations("industries");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="industries" className="relative isolate overflow-hidden bg-[#030712] py-24 md:py-36">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(86,163,255,0.14),transparent_45%),linear-gradient(180deg,#030712_0%,#07131f_50%,#040a13_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-[1380px] px-5 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        <div className="mt-14 grid gap-5 md:mt-16 md:grid-cols-2 xl:grid-cols-4">
          {INDUSTRY_KEYS.map((key, index) => (
            <motion.article
              key={key}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group rounded-[24px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.24)] backdrop-blur-xl"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-300/28 bg-blue-400/[0.1] text-blue-200">
                <span className="text-sm font-semibold">0{index + 1}</span>
              </div>
              <h3 className="mt-6 font-heading text-[22px] text-text-primary">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-text-secondary">
                {t(`items.${key}.description`)}
              </p>
              <div className="mt-6 h-px w-16 bg-gradient-to-r from-blue-300/45 to-transparent" />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
