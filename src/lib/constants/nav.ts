import { LOCALES, type Locale } from "./locales";

export type NavItem = {
  href: string;
  labelKey: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/services", labelKey: "services" },
  { href: "/about", labelKey: "about" },
  { href: "/careers", labelKey: "careers" },
  { href: "/jobs", labelKey: "jobs" },
  { href: "/portal", labelKey: "portal" },
  { href: "/contact", labelKey: "contact" },
];

export { LOCALES };
export type { Locale };
