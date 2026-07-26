import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { PublicJobsSearchPage } from "@/components/jobs/PublicJobsSearchPage";
import { buildBreadcrumbListJsonLd, buildLocalizedAlternates } from "@/lib/seo/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: buildLocalizedAlternates(locale, "/jobs"),
  };
}

export default async function JobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const breadcrumbJsonLd = buildBreadcrumbListJsonLd([
    { name: locale === "ar" ? "الرئيسية" : "Home", path: `/${locale}` },
    { name: locale === "ar" ? "الوظائف" : "Jobs", path: `/${locale}/jobs` },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
            <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-6 backdrop-blur-xl md:p-10">
              <p className="text-sm text-text-secondary">Loading jobs...</p>
            </section>
          </main>
        }
      >
        <PublicJobsSearchPage />
      </Suspense>
    </div>
  );
}
