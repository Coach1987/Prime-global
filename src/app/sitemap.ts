import type { MetadataRoute } from "next";
import { routing, getPathname } from "@/i18n/routing";
import { SITE_URL as BASE_URL } from "@/lib/constants/site";

const INDEXABLE_PATHS = [
  "/",
  "/services",
  "/services/logistics-support",
  "/services/business-administration",
  "/about",
  "/contact",
  "/careers",
  "/careers/apply",
  "/legal/terms-of-service",
  "/legal/privacy-policy",
  "/legal/cookie-policy",
  "/legal/employer-agreement",
  "/legal/candidate-agreement",
  "/legal/ai-transparency-policy",
  "/legal/payment-refund-policy",
  "/legal/data-processing-agreement",
  "/legal/security-policy",
  "/legal/trust-charter",
] as const;

async function buildAlternates(pathname: (typeof INDEXABLE_PATHS)[number]) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${BASE_URL}${await getPathname({ locale, href: pathname })}`;
  }
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const pathname of INDEXABLE_PATHS) {
      entries.push({
        url: `${BASE_URL}${await getPathname({ locale, href: pathname })}`,
        lastModified,
        changeFrequency: pathname === "/" ? "weekly" : "monthly",
        priority: pathname === "/" ? 1 : 0.8,
        alternates: {
          languages: await buildAlternates(pathname),
        },
      });
    }
  }

  return entries;
}
