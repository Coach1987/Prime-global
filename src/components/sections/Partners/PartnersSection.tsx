"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SectionHeading } from "@/components/ui/SectionHeading";

const PARTNER_KEYS = ["network", "standards", "reach", "delivery"] as const;

export function PartnersSection() {
  const t = useTranslations("partners");
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="partners" className="relative overflow-hidden bg-[#030711] py-24 md:py-36">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(92,149,255,0.12),transparent_38%)]" />

      <div className="mx-auto max-w-[1380px] px-5 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
        </div>

        <div className="mt-14 grid gap-5 md:mt-16 md:grid-cols-2 xl:grid-cols-4">
          {PARTNER_KEYS.map((key, index) => (
            <motion.div
              key={key}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.2)] backdrop-blur-xl"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-300/28 bg-blue-400/[0.1] text-blue-200">
                <span className="text-sm font-semibold">✦</span>
              </div>
              <h3 className="mt-5 font-heading text-[20px] text-text-primary">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-text-secondary">
                {t(`items.${key}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
