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
    alternates: {
      canonical: `/${locale}`,
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      <Hero />
      <WhyUsSection />
      <ServicesSection />
      <IndustriesSection />
      <ProcessSection />
      <StatsSection />
      <TestimonialsSection />
      <PartnersSection />
      <EnterpriseCtaSection />
      <ContactSection />
    </main>
  );
}
