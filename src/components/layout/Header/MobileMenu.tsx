"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link, usePathname } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { NAV_ITEMS } from "@/lib/constants/nav";
import { useIsHome } from "@/lib/hooks/useIsHome";
import { cn } from "@/lib/utils/cn";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AuthActions } from "./AuthActions";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const SECTION_IDS = ["services", "contact"];

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const isHome = useIsHome();
  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: reducedMotion ? 0 : 0.25 } },
    exit: { opacity: 0, transition: { duration: reducedMotion ? 0 : 0.2 } },
  };

  const panelVariants = {
    hidden: { y: -40, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: reducedMotion ? 0 : 0.45 },
    },
    exit: {
      y: -30,
      opacity: 0,
      transition: { duration: reducedMotion ? 0 : 0.25 },
    },
  };

  const listVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.06,
        delayChildren: reducedMotion ? 0 : 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] },
    },
  };

  useEffect(() => {
    if (!open) return;

    const first = panelRef.current?.querySelector("a");

    first?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleClick(e: React.MouseEvent, href: string) {
    const sectionId = href.replace("/", "");

    if (isHome && SECTION_IDS.includes(sectionId)) {
      e.preventDefault();
      onClose();
      window.setTimeout(() => smoothScrollTo(sectionId), 250);
      return;
    }

    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 bg-[#040b15]/95 backdrop-blur-2xl md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("openMenu")}
        >
          <motion.div
            ref={panelRef}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex h-full flex-col items-center justify-center px-8"
          >
            <div className="mb-10">
              <LanguageSwitcher />
            </div>

            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "flex w-full flex-col gap-3",
                locale === "ar" ? "items-end text-right" : "items-start text-left"
              )}
            >
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <motion.li key={item.href} variants={itemVariants} className="w-full">
                    <Link
                      href={item.href}
                      onClick={(e) => handleClick(e, item.href)}
                      className={cn(
                        "group relative flex w-full select-none items-center overflow-hidden rounded-[18px] border px-4 py-4 text-[28px] font-heading leading-none [caret-color:transparent] transition-all duration-300",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040b15]",
                        locale === "ar" ? "justify-end text-right" : "justify-start text-left",
                        active
                          ? "border-blue-300/30 bg-white/[0.06] text-blue-300"
                          : "border-transparent bg-transparent text-white hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-blue-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full bg-blue-300 transition-all duration-300",
                          locale === "ar" ? "right-2" : "left-2",
                          active
                            ? "scale-y-100 opacity-100"
                            : "scale-y-60 opacity-0 group-hover:opacity-100"
                        )}
                      />
                      <span className="relative ps-5 pe-2 rtl:ps-2 rtl:pe-5">
                        {t(item.labelKey)}
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>

            <div className="mt-14 h-px w-20 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

            <AuthActions mobile onNavigate={onClose} />

            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-500">
              PRIME GLOBAL
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
