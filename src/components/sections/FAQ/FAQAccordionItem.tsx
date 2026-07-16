"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { FAQItem } from "@/lib/constants/faq";

interface FAQAccordionItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}

export function FAQAccordionItem({ item, isOpen, onToggle }: FAQAccordionItemProps) {
  const t = useTranslations(`faq.items.${item.key}`);
  const panelId = useId();
  const buttonId = useId();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-colors duration-300",
        isOpen
          ? "border-accent-primary/40 bg-white/[0.04]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
      )}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-inset md:px-8 md:py-6"
        >
          <span
            className={cn(
              "font-heading text-base transition-colors duration-300 md:text-lg",
              isOpen ? "text-text-primary" : "text-text-primary/90"
            )}
          >
            {t("question")}
          </span>

          {/* Plus icon, rotates 45deg to form a minus-like X on open */}
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-premium-out",
              isOpen
                ? "rotate-45 border-accent-primary bg-accent-primary/15"
                : "border-white/15 bg-white/5"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 1v12M1 7h12"
                stroke={isOpen ? "#7EC4FF" : "#A8ADB6"}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-6 text-[15px] leading-relaxed text-text-secondary md:px-8 md:pb-7">
              {t("answer")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
