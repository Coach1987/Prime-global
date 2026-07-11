"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { gsap } from "@/lib/gsap";
import { Logo } from "@/components/layout/Header/Logo";
import { FooterColumn } from "./FooterColumn";
import { FooterGlow } from "./FooterGlow";
import { NAV_ITEMS } from "@/lib/constants/nav";
import { SERVICES } from "@/lib/constants/services";
import {
  CONTACT_INFO,
  WHATSAPP_LINK,
  EMAIL_LINK,
  WEBSITE_LINK,
} from "@/lib/constants/contact";

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

    const columns =
      footerRef.current.querySelectorAll<HTMLElement>("[data-footer-col]");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        columns,
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
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

  /*
   * صفحات تفاصيل الخدمات غير موجودة حاليًا، لذلك نوجّه جميع روابط
   * الخدمات إلى صفحة الخدمات الحقيقية بدل إنشاء روابط تؤدي إلى 404.
   */
  const serviceLinks = SERVICES.map((service) => ({
    label: tServices(`${service.key}.title`),
    href: "/services",
  }));

  const year = new Date().getFullYear();

  return (
    <footer
      ref={footerRef}
      className="relative isolate overflow-hidden border-t border-white/10 bg-[#020711]"
    >
      <FooterGlow />

      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#030914_0%,#020711_55%,#01040a_100%)]" />

        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-blue-600/[0.07] blur-[160px]" />

        <div className="absolute -right-48 bottom-0 h-[460px] w-[460px] rounded-full bg-cyan-400/[0.05] blur-[170px]" />

        <div className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1380px] px-5 py-16 sm:px-6 md:px-10 md:py-20 lg:py-24">
        {/* Top identity line */}
        <div className="mb-14 flex items-center gap-4">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-400/25" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(125,211,252,0.8)]" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-400/25" />
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_1.15fr] lg:gap-10">
          {/* Brand */}
          <div data-footer-col>
            <Logo scrolled={false} />

            <p className="mt-6 max-w-sm text-[15px] leading-7 text-slate-400">
              {t("tagline")}
            </p>

            <div className="mt-7 flex items-center gap-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/40 hover:bg-blue-400/10 hover:text-blue-200"
              >
                <span className="text-sm font-semibold">WA</span>
              </a>

              <a
                href={EMAIL_LINK}
                aria-label="Email"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/40 hover:bg-blue-400/10 hover:text-blue-200"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 4.5h13v9h-13v-9Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m3 5 6 4.5L15 5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>

              <a
                href={WEBSITE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Website"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/40 hover:bg-blue-400/10 hover:text-blue-200"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="9"
                    cy="9"
                    r="6.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <path
                    d="M2.8 9h12.4M9 2.5c1.7 1.7 2.6 3.9 2.6 6.5S10.7 13.8 9 15.5M9 2.5C7.3 4.2 6.4 6.4 6.4 9s.9 4.8 2.6 6.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div data-footer-col>
            <FooterColumn title={t("quickLinks")} links={quickLinks} />
          </div>

          {/* Services */}
          <div data-footer-col>
            <FooterColumn
              title={tNav("services")}
              links={serviceLinks}
            />
          </div>

          {/* Contact */}
          <div data-footer-col>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-blue-200/80">
              {t("contact")}
            </h3>

            <ul className="mt-6 space-y-5 text-[14px] text-slate-400">
              <li>
                <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-slate-600">
                  WhatsApp
                </span>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="transition-colors duration-300 hover:text-blue-200"
                >
                  {CONTACT_INFO.whatsappNumber}
                </a>
              </li>

              <li>
                <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-slate-600">
                  Email
                </span>
                <a
                  href={EMAIL_LINK}
                  dir="ltr"
                  className="break-all transition-colors duration-300 hover:text-blue-200"
                >
                  {CONTACT_INFO.email}
                </a>
              </li>

              <li>
                <span className="mb-1 block text-[11px] uppercase tracking-[0.14em] text-slate-600">
                  Location
                </span>
                <span dir={locale === "ar" ? "rtl" : "ltr"}>
                  {CONTACT_INFO.location}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center gap-5 border-t border-white/10 pt-8 text-center text-[13px] text-slate-500 sm:flex-row sm:justify-between sm:text-start">
          <p>{t("copyright", { year })}</p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href="/privacy-policy"
              className="transition-colors duration-300 hover:text-blue-200"
            >
              {t("privacyPolicy")}
            </Link>

            <Link
              href="/terms"
              className="transition-colors duration-300 hover:text-blue-200"
            >
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
