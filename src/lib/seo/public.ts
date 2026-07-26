import { SITE_URL } from "@/lib/constants/site";
import type { Locale } from "@/lib/constants/locales";
import type { Metadata } from "next";

type PublicLocale = Locale | string;

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "";
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function buildLocalizedAlternates(locale: PublicLocale, path: string): Metadata["alternates"] {
  const normalized = normalizePath(path);

  return {
    canonical: `/${locale}${normalized}`,
    languages: {
      en: `/en${normalized}`,
      ar: `/ar${normalized}`,
      "x-default": `/en${normalized}`,
    },
  };
}

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function buildWebsiteJsonLd(locale: Locale, includeSearchAction: boolean) {
  const schema: {
    "@context": "https://schema.org";
    "@type": "WebSite";
    name: string;
    url: string;
    inLanguage: Locale;
    potentialAction?: {
      "@type": "SearchAction";
      target: string;
      "query-input": string;
    };
  } = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Prime Global",
    url: `${SITE_URL}/${locale}`,
    inLanguage: locale,
  };

  if (includeSearchAction) {
    schema.potentialAction = {
      "@type": "SearchAction",
      target: `${SITE_URL}/${locale}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    };
  }

  return schema;
}
