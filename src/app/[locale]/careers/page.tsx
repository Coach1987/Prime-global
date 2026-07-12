import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";

const CareersLandingPage = dynamic(
  () => import("@/features/careers/components").then((mod) => mod.CareersLandingPage),
  {
    loading: () => <div className="mx-auto mt-[110px] h-[320px] w-full max-w-[1260px] animate-pulse rounded-3xl bg-[#0f1a2d]" />,
  }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "careers.meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}/careers` },
  };
}

export default async function CareersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="pt-[88px]">
      <CareersLandingPage />
    </main>
  );
}