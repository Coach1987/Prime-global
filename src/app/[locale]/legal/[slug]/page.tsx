import fs from "node:fs/promises";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import {
  LEGAL_DOCUMENTS,
  LEGAL_DOCUMENTS_BY_SLUG,
  getLegalSourcePath,
  type LegalDocumentKey,
} from "@/lib/legal/documents";
import { isLocale, type Locale } from "@/lib/constants/locales";

type Params = {
  locale: Locale;
  slug: LegalDocumentKey;
};

export function generateStaticParams() {
  const paths: Array<{ locale: Locale; slug: LegalDocumentKey }> = [];
  for (const locale of ["en", "ar"] as const) {
    for (const document of LEGAL_DOCUMENTS) {
      paths.push({ locale, slug: document.slug });
    }
  }
  return paths;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const document = LEGAL_DOCUMENTS_BY_SLUG.get(slug);

  if (!document) {
    return {};
  }

  const title = document.title[locale];
  const description = document.summary[locale];

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${locale}/legal/${slug}`,
      languages: {
        en: `/en/legal/${slug}`,
        ar: `/ar/legal/${slug}`,
      },
    },
  };
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const document = LEGAL_DOCUMENTS_BY_SLUG.get(slug);
  if (!document) {
    notFound();
  }

  setRequestLocale(locale);

  const content = await fs.readFile(
    getLegalSourcePath(locale, document.sourceFile),
    "utf8"
  );

  return (
    <main className="pt-[88px]">
      <section className="bg-bg-primary py-14 md:py-20">
        <div className="mx-auto w-full max-w-[940px] px-5 sm:px-6 md:px-8">
          <div className="rounded-[24px] border border-white/10 bg-[#071428]/70 p-5 shadow-[0_22px_60px_rgba(3,10,28,0.35)] md:p-8">
            <LegalMarkdown content={content} locale={locale} />
          </div>
        </div>
      </section>
    </main>
  );
}