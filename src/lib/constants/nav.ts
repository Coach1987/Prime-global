export type NavItem = {
  href: string;
  labelKey: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/services", labelKey: "services" },
  { href: "/about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
];

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
