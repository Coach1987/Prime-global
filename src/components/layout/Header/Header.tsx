"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useScrolled } from "@/lib/hooks/useScrolled";
import { useIsHome } from "@/lib/hooks/useIsHome";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./Logo";
import { NavMenu } from "./NavMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MenuToggle } from "./MenuToggle";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  const t = useTranslations("nav");
  const isHome = useIsHome();
  const scrolled = useScrolled(80);
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close the mobile menu automatically if the viewport grows to desktop width.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handle = () => mq.matches && setMenuOpen(false);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  function handleCtaClick(e: React.MouseEvent) {
    if (isHome) {
      e.preventDefault();
      smoothScrollTo("contact");
    }
  }

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-premium-out",
          scrolled
            ? "h-16 border-b border-gold/[0.12] bg-bg-primary/95 shadow-[0_4px_28px_rgba(0,0,0,0.35)] backdrop-blur-header"
            : "h-[88px] bg-transparent"
        )}
      >
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Logo scrolled={scrolled} />

          <NavMenu />

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            <Link
              href={isHome ? "#contact" : "/contact"}
              onClick={handleCtaClick}
              className={cn(
                "hidden md:inline-flex items-center rounded-[10px] border border-gold/40 bg-accent-primary px-6 py-[10px]",
                "text-[13px] font-semibold uppercase tracking-[0.06em] text-charcoal",
                "transition-all duration-200 ease-out hover:bg-gold-bright hover:border-gold-bright hover:-translate-y-0.5 active:scale-[0.98]"
              )}
            >
              {t("cta")}
            </Link>

            <MenuToggle open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
