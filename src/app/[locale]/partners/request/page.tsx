import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildBreadcrumbListJsonLd, buildLocalizedAlternates } from "@/lib/seo/public";
import { PartnerJobRequestClient } from "./PartnerJobRequestClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "طلب دعم التوظيف" : "Request Hiring Support",
    description:
      isArabic
        ? "قدّم طلب توظيف لشركتك وسيقوم فريق Prime Global بمراجعته."
        : "Submit your hiring request and Prime Global will review and route it to our recruitment workflow.",
    alternates: buildLocalizedAlternates(locale, "/partners/request"),
  };
}

export default async function PartnerJobRequestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: locale === "ar" ? "الرئيسية" : "Home", path: `/${locale}` },
    { name: locale === "ar" ? "طلب شراكة" : "Partner Request", path: `/${locale}/partners/request` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PartnerJobRequestClient />
    </>
  );
}
