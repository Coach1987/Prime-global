import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServicesSection } from "@/components/sections/Services";
import { buildBreadcrumbListJsonLd, buildLocalizedAlternates } from "@/lib/seo/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "services" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: buildLocalizedAlternates(locale, "/services"),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "services" });
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: locale === "ar" ? "الرئيسية" : "Home", path: `/${locale}` },
    { name: t("title"), path: `/${locale}/services` },
  ]);

  return (
    <main className="pt-[88px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ServicesSection />
    </main>
  );
}
