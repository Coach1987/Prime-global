import Link from "next/link";
import { setRequestLocale } from "next-intl/server";

export default async function EmployersLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="relative isolate mx-auto min-h-[calc(100vh-120px)] w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_35%_at_50%_10%,rgba(201,162,75,0.18),rgba(10,14,20,0))]" />
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/70 p-8 shadow-[0_18px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Employer Portal</p>
        <h1 className="mt-4 font-heading text-4xl leading-tight text-text-primary md:text-5xl">
          Recruit With Confidence On Prime Global
        </h1>
        <p className="mt-6 max-w-3xl text-base text-text-secondary md:text-lg">
          Create your company profile, upload verification documents, and publish premium job listings once approved by
          our admin team.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href={`/${locale}/employers/register`}
            className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-bg-primary transition hover:bg-gold-bright"
          >
            Register Company
          </Link>
          <Link
            href={`/${locale}/employers/login`}
            className="rounded-full border border-gold/50 px-7 py-3 text-sm font-semibold text-gold transition hover:border-gold hover:bg-gold/10"
          >
            Login
          </Link>
          <Link
            href={`/${locale}/employers/dashboard`}
            className="rounded-full border border-text-secondary/30 px-7 py-3 text-sm font-semibold text-text-secondary transition hover:border-gold/50 hover:text-gold"
          >
            Open Dashboard
          </Link>
          <Link
            href={`/${locale}/partners/request`}
            className="rounded-full border border-gold/30 px-7 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10"
          >
            Request Hiring Support
          </Link>
        </div>
      </section>
    </main>
  );
}
