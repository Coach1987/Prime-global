import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Terms of Service",
    robots: { index: false, follow: true },
    alternates: { canonical: `/${locale}/terms` },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="pt-[88px]">
      <section className="bg-bg-primary py-16 md:py-32">
        <div className="mx-auto max-w-[760px] px-5 md:px-8">
          <h1 className="font-heading text-3xl text-text-primary">Terms of Service</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
            This page is a placeholder. Prime Global&apos;s actual terms of
            service need to be drafted (ideally with legal review) and
            placed here before this page is published or indexed by search
            engines.
          </p>
        </div>
      </section>
    </main>
  );
}
