"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { gsap } from "@/lib/gsap";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FAQAccordionItem } from "./FAQAccordionItem";
import { FAQ_ITEMS } from "@/lib/constants/faq";
import { useIsHome } from "@/lib/hooks/useIsHome";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";

export function FAQSection() {
  const t = useTranslations("faq");
  const isHome = useIsHome();
  const listRef = useRef<HTMLDivElement>(null);

  // Single-open accordion: opening one item closes any other. First item
  // starts open so visitors immediately see the expand/collapse affordance.
  const [openKey, setOpenKey] = useState<string | null>(FAQ_ITEMS[0]?.key ?? null);

  function handleToggle(key: string) {
    setOpenKey((current) => (current === key ? null : key));
  }

  function handleContactClick(e: React.MouseEvent) {
    if (isHome) {
      e.preventDefault();
      smoothScrollTo("contact");
    }
  }

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !listRef.current) return;

    const rows = listRef.current.querySelectorAll("[data-faq-row]");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rows,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: listRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );
    }, listRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative bg-bg-primary py-16 md:py-32">
      <div className="mx-auto max-w-[820px] px-5 md:px-8">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

        <div ref={listRef} className="mt-12 flex flex-col gap-4 md:mt-16">
          {FAQ_ITEMS.map((item) => (
            <div key={item.key} data-faq-row className="opacity-100">
              <FAQAccordionItem
                item={item}
                isOpen={openKey === item.key}
                onToggle={() => handleToggle(item.key)}
              />
            </div>
          ))}
        </div>

        {/* Fallback for questions not covered here */}
        <p className="mt-10 text-center text-[15px] text-text-secondary">
          {t("stillHaveQuestions")}{" "}
          <Link
            href={isHome ? "#contact" : "/contact"}
            onClick={handleContactClick}
            className="font-semibold text-accent-primary underline-offset-4 hover:underline"
          >
            {t("contactUs")}
          </Link>
        </p>
      </div>
    </section>
  );
}
