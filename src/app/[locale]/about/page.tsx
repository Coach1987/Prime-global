import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";

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
    { key: "recruitment" },
    { key: "logistics" },
    { key: "businessDevelopment" },
    { key: "consulting" },
  ];

  return (
    <main className="pt-[88px]">
      <section className="bg-bg-primary py-16 md:py-32">
        <div className="mx-auto max-w-[920px] px-5 md:px-8">
          <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <article
                key={capability.key}
                className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              >
                <div className="mb-3 h-8 w-8 rounded-full border border-gold/30 bg-gold/[0.08]" aria-hidden="true" />
                <h3 className="font-heading text-[20px] text-text-primary">
                  {t(`capabilities.${capability.key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                  {t(`capabilities.${capability.key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
