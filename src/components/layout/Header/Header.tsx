"use client";

import { useEffect, useState } from "react";
import { useScrolled } from "@/lib/hooks/useScrolled";
import { cn } from "@/lib/utils/cn";
import { Logo } from "./Logo";
import { NavMenu } from "./NavMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MenuToggle } from "./MenuToggle";
import { MobileMenu } from "./MobileMenu";
import { AuthActions } from "./AuthActions";

export function Header() {
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

            <AuthActions />

            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

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
