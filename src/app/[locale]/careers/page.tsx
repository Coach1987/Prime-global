import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";

const ApplicationForm = dynamic(
  () => import("@/features/careers/components").then((mod) => mod.ApplicationForm),
  {
    loading: () => <div className="mx-auto mt-6 h-[700px] w-full max-w-5xl animate-pulse rounded-3xl bg-[#0f1a2d]" />,
  }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "careers.apply.meta" });

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
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-16 pt-[112px] sm:px-6 sm:pb-20 md:px-8">
      <ApplicationForm />
    </main>
  );
}