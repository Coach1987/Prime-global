"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

const STEP_KEYS = ["discover", "plan", "execute", "deliver"] as const;

export function ProcessSection() {
  const t = useTranslations("process");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="process" className="relative overflow-hidden bg-[#050913] py-24 md:py-36">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,rgba(92,149,255,0.14),transparent_45%)]" />

      <div className="mx-auto max-w-[1380px] px-5 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        <div className="mt-14 grid gap-5 md:mt-16 lg:grid-cols-4">
          {STEP_KEYS.map((key, index) => (
            <motion.div
              key={key}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.24)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold uppercase tracking-[0.24em] text-blue-300">
                  {t(`steps.${key}.phase`)}
                </span>
                <span className="text-[12px] uppercase tracking-[0.24em] text-text-tertiary">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-[22px] text-text-primary">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-text-secondary">
                {t(`steps.${key}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
