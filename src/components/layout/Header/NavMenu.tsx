"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { NAV_ITEMS } from "@/lib/constants/nav";
import { useActiveSection } from "@/lib/hooks/useActiveSection";
import { useIsHome } from "@/lib/hooks/useIsHome";
import { smoothScrollTo } from "@/lib/utils/smoothScroll";
import { cn } from "@/lib/utils/cn";

const SECTION_IDS = ["services", "contact"];

export function NavMenu() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const activeSection = useActiveSection(SECTION_IDS);
  const isHome = useIsHome();

  function isActive(href: string) {
    if (href === "/") return isHome && !activeSection;
    const sectionId = href.replace("/", "");
    if (isHome && SECTION_IDS.includes(sectionId)) {
      return activeSection === sectionId;
    }
    return pathname.endsWith(href);
  }

  function handleClick(e: React.MouseEvent, href: string) {
    const sectionId = href.replace("/", "");
    if (isHome && SECTION_IDS.includes(sectionId)) {
      e.preventDefault();
      smoothScrollTo(sectionId);
    }
  }

  return (
    <nav aria-label="Primary" className="hidden md:flex items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => handleClick(e, item.href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative px-4 py-2 text-[13px] font-medium uppercase tracking-[0.1em] transition-colors duration-200",
              active ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t(item.labelKey)}
            <span
              className={cn(
                "absolute inset-x-4 -bottom-0.5 h-px origin-center bg-blue-300 transition-transform duration-300 ease-premium-out",
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
