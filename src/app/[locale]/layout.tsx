import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/constants/site";
import { displaySerif, inter, tajawal } from "@/lib/fonts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScrollProvider } from "@/components/shared/SmoothScrollProvider";
import { cn } from "@/lib/utils/cn";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  const title = "Prime Global — Tunisian Global Expertise";
  const description = t("subtext");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: "%s | Prime Global",
    },
    description,
    // No `alternates.languages` here — this was previously hardcoded to
    // { en: "/en", ar: "/ar" } (the homepage only), but since Next.js
    // merges metadata down the layout tree, every child page that didn't
    // override this (About, Services, Contact) inherited an hreflang
    // mapping that incorrectly pointed their Arabic/English alternates
    // back to the homepage instead of their own translated equivalent.
    // Individual pages that need correct hreflang alternates should set
    // their own `alternates.languages` explicitly (see sitemap.ts for
    // the pattern, which already does this correctly via getPathname).
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}`,
      siteName: "Prime Global",
      locale: locale === "ar" ? "ar_TN" : "en_US",
      type: "website",
      // No `images` entry here — Next.js automatically detects and serves
      // app/[locale]/opengraph-image.tsx via filesystem convention, so
      // manually referencing an image path here would just create a
      // second, non-existent, conflicting entry.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
      },
    },
    // No manual `icons` entry needed — Next.js automatically detects
    // src/app/favicon.ico via filesystem convention (favicons must live
    // in the root /app segment, not inside [locale] — see
    // https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons).
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0E14",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {+x
    notFound();
  }

  // Enables static rendering for this locale (see next-intl docs) — pages
  // under this layout can be statically generated at build time instead
  // of opting into dynamic rendering just because useTranslations is used.
  setRequestLocale(locale);

  // IMPORTANT: on next-intl v3 (our pinned version), NextIntlClientProvider
  // does NOT automatically inherit messages from i18n/request.ts — that
  // auto-inheritance was only added in v4. On v3, messages must be
  // explicitly fetched and passed here, or every Client Component using
  // useTranslations (Header, Hero, Services, WhyUs, Testimonials, FAQ,
  // Footer — all of them) will silently fail to resolve translations.
  const messages = await getMessages();

  const dir = locale === "ar" ? "rtl" : "ltr";

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Prime Global",
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo/prime-global-logo.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sousse",
      addressCountry: "TN",
    },
    email: "info@primeglobal.tn",
  };

  return (
    <html
      lang={locale}
      dir={dir}
      className={cn(displaySerif.variable, inter.variable, tajawal.variable)}
      style={
        {
          "--font-heading-active":
            locale === "ar" ? "var(--font-tajawal)" : "var(--font-display-serif)",
        } as React.CSSProperties
      }
    >
      <body className={cn(locale === "ar" ? "font-arabic" : "font-body", "min-h-screen")}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* JSON-LD structured data for search engines */}
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          />

          <SmoothScrollProvider>
            <Header />
            {children}
            <Footer />
          </SmoothScrollProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
