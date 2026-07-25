import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { PublicJobsSearchPage } from "@/components/jobs/PublicJobsSearchPage";

export default async function JobsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
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
  );
}
