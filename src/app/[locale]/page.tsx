import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/Hero";
import { WhyUsSection } from "@/components/sections/WhyUs";
import { ServicesSection } from "@/components/sections/Services";
import { IndustriesSection } from "@/components/sections/Industries/IndustriesSection";
import { ProcessSection } from "@/components/sections/Process/ProcessSection";
import { StatsSection } from "@/components/sections/Stats/StatsSection";
import { TestimonialsSection } from "@/components/sections/Testimonials";
import { PartnersSection } from "@/components/sections/Partners/PartnersSection";
import { EnterpriseCtaSection } from "@/components/sections/CTA/EnterpriseCtaSection";
import { ContactSection } from "@/components/sections/Contact";
import { SponsoredAdvertisementsSection } from "@/components/sections/Advertisements";
import { HomepageJourney } from "@/components/sections/HomepageJourney";
import { CinematicBackground } from "@/components/sections/CinematicBackground";
import { isLocale } from "@/lib/constants/locales";
import { buildLocalizedAlternates, buildWebsiteJsonLd } from "@/lib/seo/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return {
    // No title set here — inherits the root layout's `default` title
    // ("Prime Global — Tunisian Global Expertise") rather than going
    // through the "%s | Prime Global" template, which would otherwise
    // produce a redundant "Home | Prime Global" for the homepage.
    description: t("subtext"),
    alternates: buildLocalizedAlternates(locale, ""),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const websiteJsonLd = buildWebsiteJsonLd(isLocale(locale) ? locale : "en", true);

  return (
    <main data-home-journey>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HomepageJourney />
      <Hero />
      <div id="sponsored-advertisements" data-home-section data-home-pattern="a" data-cinematic-section data-home-scene="tunisia" className="relative isolate overflow-hidden">
        <CinematicBackground
          src="/images/cinematic/tunisia-orbital-night.webp"
          position="object-[58%_50%]"
          priority
          overlayClassName="bg-[linear-gradient(180deg,rgba(3,9,20,0.58)_0%,rgba(3,10,22,0.72)_45%,rgba(3,8,18,0.9)_100%)]"
        />
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-200/45 to-transparent" />
        <SponsoredAdvertisementsSection locale={locale} />
      </div>
      <div data-home-section data-home-pattern="a" data-home-directional-exit data-cinematic-section data-home-scene="dubai" className="relative isolate overflow-hidden">
        <CinematicBackground src="/images/cinematic/dubai-night.webp" position="object-[50%_48%]" />
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <WhyUsSection />
      </div>
      <div data-home-section data-home-pattern="b" data-home-directional-exit data-cinematic-section data-home-scene="doha" className="relative isolate overflow-hidden">
        <CinematicBackground src="/images/cinematic/doha-night.webp" position="object-[52%_50%]" />
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <ServicesSection />
      </div>
      <div data-home-section data-home-pattern="c" data-home-directional-exit data-cinematic-section data-home-scene="kuwait" className="relative isolate overflow-hidden">
        <CinematicBackground src="/images/cinematic/kuwait-night.webp" position="object-[54%_50%]" />
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <IndustriesSection />
      </div>
      <div data-home-section data-home-pattern="d" data-home-directional-exit data-cinematic-section data-home-scene="bahrain" className="relative isolate overflow-hidden">
        <CinematicBackground src="/images/cinematic/bahrain-night.webp" position="object-[52%_50%]" />
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <ProcessSection />
      </div>
      <div data-home-section data-home-pattern="a" data-home-directional-exit data-cinematic-section data-home-scene="saudi" className="relative isolate overflow-hidden">
        <CinematicBackground
          src="/images/cinematic/saudi-orbital-night.webp"
          position="object-[50%_46%]"
          overlayClassName="bg-[linear-gradient(180deg,rgba(2,7,17,0.68)_0%,rgba(3,10,22,0.78)_48%,rgba(3,8,18,0.9)_100%)] md:bg-[linear-gradient(180deg,rgba(2,7,17,0.5)_0%,rgba(3,10,22,0.58)_44%,rgba(3,8,18,0.72)_100%)]"
        />
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <StatsSection />
      </div>
      <div data-home-section data-home-pattern="b" className="relative">
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <TestimonialsSection />
      </div>
      <div data-home-section data-home-pattern="c" className="relative">
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <PartnersSection />
      </div>
      <div data-home-section data-home-pattern="d" className="relative">
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <EnterpriseCtaSection />
      </div>
      <div data-home-section data-home-pattern="c" data-home-directional-exit data-cinematic-section data-home-scene="cairo" className="relative isolate overflow-hidden">
        <CinematicBackground
          src="/images/cinematic/cairo-night.webp"
          position="object-[55%_50%]"
          overlayClassName="bg-[linear-gradient(180deg,rgba(2,7,17,0.7)_0%,rgba(3,10,22,0.78)_46%,rgba(3,8,18,0.9)_100%)] md:bg-[linear-gradient(180deg,rgba(2,7,17,0.54)_0%,rgba(3,10,22,0.62)_44%,rgba(3,8,18,0.76)_100%)]"
        />
        <span data-home-bridge aria-hidden="true" className="pointer-events-none absolute inset-x-[14%] top-0 z-20 h-px origin-center bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        <ContactSection />
      </div>
    </main>
  );
}
