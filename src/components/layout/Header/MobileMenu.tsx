"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { NAV_ITEMS } from "@/lib/constants/nav";
import { useIsHome } from "@/lib/hooks/useIsHome";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/utils/cn";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const SECTION_IDS = ["services", "about", "contact"];
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const t = useTranslations("nav");
  const isHome = useIsHome();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape-to-close, per WAI-ARIA APG dialog pattern. Without
  // this, keyboard/screen-reader users who open the menu have no way to
  // close it without a mouse, and Tab can escape into content hidden
  // behind the overlay. Uses querySelector rather than a ref forwarded
  // through next-intl's Link component, since ref-forwarding support
  // there isn't guaranteed across versions — this is more robust.
  useEffect(() => {
    if (!open || !panelRef.current) return;

    const panel = panelRef.current;
    const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  function handleClick(e: React.MouseEvent, href: string) {
    const sectionId = href.replace("/", "");
    if (isHome && SECTION_IDS.includes(sectionId)) {
      e.preventDefault();
      onClose();
      // Let the overlay close before scrolling so the motion doesn't fight.
      window.setTimeout(() => smoothScrollTo(sectionId), 200);
    } else {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-menu"
          ref={panelRef}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-40 flex flex-col border-t border-gold/[0.15] bg-bg-primary/98 backdrop-blur-xl md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("openMenu")}
        >
          <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center gap-1 text-center"
            >
              {NAV_ITEMS.map((item) => (
                <motion.li key={item.href} variants={itemVariants}>
                  <Link
                    href={item.href}
                    onClick={(e) => handleClick(e, item.href)}
                    className={cn(
                      "block px-4 py-4 font-heading text-2xl text-text-primary transition-colors duration-200 active:text-gold",
                      "min-h-[56px] flex items-center justify-center"
                    )}
                  >
                    {t(item.labelKey)}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="mt-10 flex flex-col items-center gap-6"
            >
              <span className="h-px w-10 bg-gold/30" aria-hidden="true" />
              <LanguageSwitcher />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
