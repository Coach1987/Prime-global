"use client";

import { useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { gsap } from "@/lib/gsap";
import { Logo } from "@/components/layout/Header/Logo";
import { FooterColumn } from "./FooterColumn";
import { FooterGlow } from "./FooterGlow";
import { NAV_ITEMS } from "@/lib/constants/nav";
import { SERVICES } from "@/lib/constants/services";
import { CONTACT_INFO, WHATSAPP_LINK, EMAIL_LINK } from "@/lib/constants/contact";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tServices = useTranslations("services.items");
  const locale = useLocale();
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !footerRef.current) return;

    const columns = footerRef.current.querySelectorAll("[data-footer-col]");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        columns,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 90%",
            once: true,
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  const quickLinks = NAV_ITEMS.map((item) => ({
    label: tNav(item.labelKey),
    href: item.href,
  }));

  const serviceLinks = SERVICES.map((service) => ({
    label: tServices(`${service.key}.title`),
    href: `/services/${service.slug}`,
  }));

  const year = new Date().getFullYear();

  return (
    <footer
      ref={footerRef}
      className="relative overflow-hidden border-t border-white/[0.08] bg-[#08090C]"
    >
      <FooterGlow />

      <div className="relative mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand column */}
          <div data-footer-col className="opacity-100">
            <Logo scrolled={false} />
            <p className="mt-5 max-w-[240px] text-[14px] leading-relaxed text-text-secondary">
              {t("tagline")}
            </p>
          </div>

          <div data-footer-col className="opacity-100">
            <FooterColumn title={t("quickLinks")} links={quickLinks} />
          </div>

          <div data-footer-col className="opacity-100">
            <FooterColumn title={tNav("services")} links={serviceLinks} />
          </div>

          <div data-footer-col className="opacity-100">
            <h3 className="font-heading text-[13px] uppercase tracking-[0.08em] text-text-tertiary">
              {t("contact")}
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-[14px] text-text-secondary">
              <li>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200 hover:text-text-primary"
                  dir="ltr"
                >
                  {CONTACT_INFO.whatsappNumber}
                </a>
              </li>
              <li>
                <a
                  href={EMAIL_LINK}
                  className="transition-colors duration-200 hover:text-text-primary"
                  dir="ltr"
                >
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li dir={locale === "ar" ? "rtl" : "ltr"}>{CONTACT_INFO.location}</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center gap-4 border-t border-white/[0.08] pt-8 text-[13px] text-text-tertiary sm:flex-row sm:justify-between">
          <p>{t("copyright", { year })}</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="transition-colors duration-200 hover:text-text-secondary">
              {t("privacyPolicy")}
            </Link>
            <Link href="/terms" className="transition-colors duration-200 hover:text-text-secondary">
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
