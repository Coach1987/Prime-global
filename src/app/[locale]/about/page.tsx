import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Link } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}/about` },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  const capabilities = [
    { key: "recruitment", href: "/careers" },
    { key: "logistics", href: "/services/logistics" },
    { key: "businessDevelopment", href: "/services/business-development" },
  ];

  return (
    <main className="pt-[88px]">
      <section className="bg-bg-primary py-16 md:py-32">
        <div className="mx-auto max-w-[920px] px-5 md:px-8">
          <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <Link
                key={capability.key}
                href={capability.href}
                className="group block rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 hover:border-blue-300/25 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <div className="mb-3 h-8 w-8 rounded-full border border-gold/30 bg-gold/[0.08]" aria-hidden="true" />
                <h3 className="font-heading text-[20px] text-text-primary">
                  {t(`capabilities.${capability.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                  {t(`capabilities.${capability.key}.description`)}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-blue-200/90 transition-colors duration-300 group-hover:text-blue-100">
                  {t("learnMore")}
                  <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">&rarr;</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
