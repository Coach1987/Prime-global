"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { LOCALES, type Locale } from "@/lib/constants/nav";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === locale) return;
    // next-intl's router already knows how to re-prefix the current
    // pathname for a different locale — no manual string splitting needed.
    router.replace(pathname, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5 text-[13px] font-medium"
    >
      {LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          aria-pressed={locale === loc}
          className={cn(
            "rounded-full px-3.5 py-[7px] uppercase tracking-wide transition-colors duration-200",
            locale === loc
              ? "bg-accent-primary text-charcoal"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
