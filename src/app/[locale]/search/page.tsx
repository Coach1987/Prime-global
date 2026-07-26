import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildBreadcrumbListJsonLd, buildLocalizedAlternates } from "@/lib/seo/public";
import { GlobalSearchClient } from "./GlobalSearchClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "البحث العالمي عن المواهب" : "Global Talent Search",
    description:
      isArabic
        ? "ابحث عن الوظائف والشركات والمرشحين حسب المهارات والموقع والخبرة."
        : "Search jobs, employers, and candidates by skill, location, and experience.",
    alternates: buildLocalizedAlternates(locale, "/search"),
  };
}

export default async function GlobalSearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: locale === "ar" ? "الرئيسية" : "Home", path: `/${locale}` },
    { name: locale === "ar" ? "البحث" : "Search", path: `/${locale}/search` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <GlobalSearchClient />
    </>
  );
}
