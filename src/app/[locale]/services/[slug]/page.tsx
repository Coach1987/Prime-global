import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { getServiceBySlug, getServiceDetail } from "@/lib/constants/services";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return {
      title: "Service not found",
      alternates: { canonical: `/${locale}/services/${slug}` },
    };
  }

  const t = await getTranslations({ locale, namespace: `services.items.${service.key}` });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}/services/${slug}` },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const service = getServiceBySlug(slug);
  if (!service) {
    notFound();
  }

  const detail = getServiceDetail(service.key);
  if (!detail) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: `services.items.${service.key}` });
  const isArabic = locale === "ar";

  return (
    <main className="pt-[88px]">
      <section className="bg-bg-primary py-16 md:py-28">
        <div className="mx-auto max-w-[1040px] px-5 md:px-8">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-blue-200/90 transition hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
          >
            <span aria-hidden="true" className="rtl:rotate-180">←</span>
            {isArabic ? "العودة إلى الخدمات" : "Back to Services"}
          </Link>

          <div className="mt-6 max-w-3xl">
            <PrimePageTitle>{t("title")}</PrimePageTitle>
            <p className="mt-3 text-sm leading-7 text-text-secondary md:text-[15px]">{t("description")}</p>
          </div>

          <PrimeCard className="mt-10 border border-white/[0.08] bg-white/[0.035] p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200/80">
              {isArabic ? "نظرة عامة" : "Overview"}
            </p>
            <p className="mt-4 max-w-3xl text-[17px] leading-8 text-slate-200">
              {detail.summary[isArabic ? "ar" : "en"]}
            </p>
          </PrimeCard>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {detail.sections.map((section) => (
              <PrimeCard key={section.title.en} className="h-full border border-white/[0.08] bg-white/[0.03] p-6 md:p-7">
                <p className="text-sm uppercase tracking-[0.2em] text-blue-200/80">{section.title[isArabic ? "ar" : "en"]}</p>
                <p className="mt-3 text-sm leading-7 text-text-secondary md:text-[15px]">
                  {section.body[isArabic ? "ar" : "en"]}
                </p>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-200">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.en} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-300" />
                      <span>{bullet[isArabic ? "ar" : "en"]}</span>
                    </li>
                  ))}
                </ul>
              </PrimeCard>
            ))}
          </div>

          <PrimeCard className="mt-8 border border-blue-300/20 bg-[#071428]/80 p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-blue-200/80">
              {isArabic ? "الخطوة التالية" : "Next step"}
            </p>
            <p className="mt-3 text-sm leading-7 text-text-secondary md:text-[15px]">
              {detail.nextStep[isArabic ? "ar" : "en"]}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/auth?mode=signup&role=candidate" className="inline-flex items-center rounded-xl border border-blue-300/30 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_35px_rgba(30,120,255,0.35)]">
                {isArabic ? "ابدأ الآن" : "Get Started"}
              </Link>
              <Link href="/contact" className="inline-flex items-center rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-text-primary transition-all duration-300 hover:border-blue-300/25 hover:bg-white/[0.04]">
                {isArabic ? "تواصل معنا" : "Contact Us"}
              </Link>
            </div>
          </PrimeCard>
        </div>
      </section>
    </main>
  );
}