import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "serviceDetails.businessDevelopment" });

  return {
    title: t("title"),
    description: t("intro"),
    alternates: { canonical: `/${locale}/services/business-development` },
  };
}

export default async function BusinessDevelopmentServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "serviceDetails.businessDevelopment" });

  const capabilities = ["marketEntry", "partnerships", "pipeline", "accountGrowth"] as const;
  const reasons = ["advisory", "execution", "longTerm"] as const;

  return (
    <main className="pt-[88px]">
      <section className="bg-bg-primary py-16 md:py-24">
        <div className="mx-auto max-w-[980px] px-5 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/90">{t("eyebrow")}</p>
          <h1 className="mt-3 font-heading text-[34px] text-text-primary sm:text-[46px]">{t("title")}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-secondary sm:text-[16px]">{t("intro")}</p>

          <div className="mt-10 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_16px_44px_rgba(0,0,0,0.24)] sm:p-8">
            <h2 className="font-heading text-[24px] text-white">{t("capabilitiesTitle")}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {capabilities.map((item) => (
                <li key={item} className="rounded-xl border border-white/[0.08] bg-[#0d1624]/70 px-4 py-3 text-sm text-slate-200">
                  {t(`capabilities.${item}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
            <h2 className="font-heading text-[24px] text-white">{t("whyTitle")}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300 sm:text-[15px]">
              {reasons.map((item) => (
                <li key={item}>{t(`why.${item}`)}</li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-blue-100/45 bg-gradient-to-r from-[#2a85eb] via-[#4fa8ff] to-[#1d66c8] px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(67,149,246,0.3)] transition-all duration-300 hover:-translate-y-1"
            >
              {t("cta")}
            </Link>
            <Link
              href="/services"
              className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-blue-300/50"
            >
              {t("backToServices")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
