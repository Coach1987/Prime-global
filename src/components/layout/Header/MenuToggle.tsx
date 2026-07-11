"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

interface MenuToggleProps {
  open: boolean;
  onToggle: () => void;
}

export function MenuToggle({ open, onToggle }: MenuToggleProps) {
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? t("closeMenu") : t("openMenu")}
      aria-expanded={open}
      className="relative z-50 flex h-9 w-9 items-center justify-center rounded-full md:hidden"
    >
      <span className="relative flex h-[14px] w-[18px] flex-col justify-between">
        <span
          className={cn(
            "h-[1.5px] w-full origin-center bg-text-primary transition-transform duration-300 ease-premium-out",
            open && "translate-y-[6px] rotate-45"
          )}
        />
        <span
          className={cn(
            "h-[1.5px] w-full bg-text-primary transition-opacity duration-200",
            open && "opacity-0"
          )}
        />
        <span
          className={cn(
            "h-[1.5px] w-full origin-center bg-text-primary transition-transform duration-300 ease-premium-out",
            open && "-translate-y-[6px] -rotate-45"
          )}
        />
      </span>
    </button>
  );
}
