import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactSection } from "@/components/sections/Contact";
import { buildBreadcrumbListJsonLd, buildLocalizedAlternates } from "@/lib/seo/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    // No "| Prime Global" suffix here — the root layout's metadata
    // template already appends it automatically for every page.
    title: t("title"),
    description: t("description"),
    alternates: buildLocalizedAlternates(locale, "/contact"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: locale === "ar" ? "الرئيسية" : "Home", path: `/${locale}` },
    { name: t("title"), path: `/${locale}/contact` },
  ]);

  return (
    <main className="pt-[88px]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContactSection />
    </main>
  );
}
