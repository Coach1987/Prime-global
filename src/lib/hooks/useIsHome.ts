"use client";

import { usePathname } from "@/i18n/routing";

/**
 * True when the current route is the (locale-prefixed) homepage.
 *
 * Uses next-intl's locale-aware `usePathname`, which returns the pathname
 * WITH the locale prefix already stripped (e.g. "/" for both `/en` and
 * `/ar`), so no manual regex against `/en|ar/` is needed.
 */
export function useIsHome() {
  const pathname = usePathname();
  return pathname === "/";
}
