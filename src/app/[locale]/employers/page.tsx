import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmployerTourLauncher } from "@/features/employers/tour/EmployerTourLauncher";
import { buildBreadcrumbListJsonLd, buildLocalizedAlternates } from "@/lib/seo/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "بوابة أصحاب العمل" : "Employer Portal",
    description:
      isArabic
        ? "أنشئ ملف شركتك وانشر الوظائف عبر بوابة أصحاب العمل في Prime Global."
        : "Create your company profile and publish jobs from the Prime Global employer portal.",
    alternates: buildLocalizedAlternates(locale, "/employers"),
  };
}

export default async function EmployersLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "employerLanding" });
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: locale === "ar" ? "الرئيسية" : "Home", path: `/${locale}` },
    { name: locale === "ar" ? "أصحاب العمل" : "Employers", path: `/${locale}/employers` },
  ]);

  return (
    <main className="relative isolate mx-auto min-h-[calc(100vh-120px)] w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_35%_at_50%_10%,rgba(86,163,255,0.2),rgba(10,14,20,0))]" />
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/70 p-8 shadow-[0_18px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">{t("eyebrow")}</p>
        <h1 className="mt-4 font-heading text-4xl leading-tight text-text-primary md:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-3xl text-base text-text-secondary md:text-lg">
          {t("description")}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href={`/${locale}/employers/register`}
            data-tour="employer-create-account"
            className="rounded-full border border-blue-100/45 bg-gradient-to-r from-[#2a85eb] via-[#4fa8ff] to-[#1d66c8] px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(67,149,246,0.3)] transition hover:-translate-y-0.5"
          >
            {t("register")}
          </Link>
          <Link
            href={`/${locale}/employers/login`}
            className="rounded-full border border-gold/50 px-7 py-3 text-sm font-semibold text-gold transition hover:border-gold hover:bg-gold/10"
          >
            {t("login")}
          </Link>
          <Link
            href={`/${locale}/employers/dashboard`}
            className="rounded-full border border-text-secondary/30 px-7 py-3 text-sm font-semibold text-text-secondary transition hover:border-gold/50 hover:text-gold"
          >
            {t("dashboard")}
          </Link>
          <Link
            href={`/${locale}/partners/request`}
            className="rounded-full border border-gold/30 px-7 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10"
          >
            {t("support")}
          </Link>
          <EmployerTourLauncher />
        </div>
      </section>
    </main>
  );
}
