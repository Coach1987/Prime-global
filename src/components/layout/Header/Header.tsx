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
  const scrolled = useScrolled(60);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width:768px)");
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
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled
            ? "h-[72px] border-b border-[#c9ab76]/20 bg-[#06111d]/74 backdrop-blur-[30px] shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:h-[74px]"
            : "h-[72px] bg-transparent md:h-[92px]"
        )}
      >
        <div className="mx-auto flex h-full max-w-[1380px] items-center justify-between px-4 ltr:pl-2 rtl:pr-2 sm:px-5 sm:ltr:pl-3 sm:rtl:pr-3 md:px-10">

          <div className="origin-left rtl:origin-right">
            <Logo scrolled={scrolled} />
          </div>

          <NavMenu />

          <div className="flex items-center gap-4">

            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            <Link
              href={isHome ? "#contact" : "/contact"}
              onClick={handleCtaClick}
              className="hidden md:inline-flex items-center rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(30,120,255,0.35)]"
            >
              {t("cta")}
            </Link>

            <MenuToggle
              open={menuOpen}
              onToggle={() => setMenuOpen((v) => !v)}
            />

          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}
