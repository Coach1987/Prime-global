"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { NAV_ITEMS } from "@/lib/constants/nav";
import { useIsHome } from "@/lib/hooks/useIsHome";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const SECTION_IDS = ["services", "about", "contact"];

const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panel = {
  hidden: {
    y: -40,
    opacity: 0
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.45
    }
  },
  exit: {
    y: -30,
    opacity: 0,
    transition: {
      duration: 0.25
    }
  }
};

export function MobileMenu({
  open,
  onClose,
}: MobileMenuProps) {

  const t = useTranslations("nav");
  const isHome = useIsHome();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    if (!open) return;

    const first =
      panelRef.current?.querySelector("a");

    first?.focus();

  }, [open]);

  function handleClick(
    e: React.MouseEvent,
    href: string
  ) {

    const section = href.replace("/", "");

    if (
      isHome &&
      SECTION_IDS.includes(section)
    ) {
      e.preventDefault();

      onClose();

      setTimeout(() => {
        smoothScrollTo(section);
      }, 250);

      return;
    }

    onClose();
  }

  return (
    <AnimatePresence>

      {open && (

        <motion.div
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 bg-[#040b15]/95 backdrop-blur-2xl md:hidden"
        >

          <motion.div
            ref={panelRef}
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex h-full flex-col items-center justify-center px-8"
          >

            <div className="mb-10">

              <LanguageSwitcher />

            </div>

            <nav className="flex flex-col items-center gap-5">

              {NAV_ITEMS.map((item) => (

                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) =>
                    handleClick(e, item.href)
                  }
                  className="group text-[32px] font-heading font-semibold tracking-[0.05em] text-white transition-all duration-300 hover:text-blue-300"
                >
                  {t(item.labelKey)}

                </Link>

              ))}

            </nav>

            <div className="mt-14 h-px w-20 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-500">
              PRIME GLOBAL
            </p>

          </motion.div>

        </motion.div>

      )}

    </AnimatePresence>
  );
}
