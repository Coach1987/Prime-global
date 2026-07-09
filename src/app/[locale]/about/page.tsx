import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return {
    title: "About Us",
    description: t("subtext"),
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
  const t = await getTranslations({ locale, namespace: "hero" });

  return (
    <main className="pt-[88px]">
      <section className="bg-bg-primary py-16 md:py-32">
        <div className="mx-auto max-w-[820px] px-5 md:px-8">
          <SectionHeading eyebrow={t("eyebrow")} title="About Prime Global" description={t("subtext")} />
        </div>
      </section>
    </main>
  );
}
