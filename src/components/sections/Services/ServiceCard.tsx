"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { IconBadge } from "@/components/ui/IconBadge";
import type { ServiceItem } from "@/lib/constants/services";

interface ServiceCardProps {
  service: ServiceItem;
  index: number;
}

export function ServiceCard({ service, index }: ServiceCardProps) {
  const t = useTranslations(`services.items.${service.key}`);
  const tCommon = useTranslations("services");
  const indexLabel = String(index + 1).padStart(2, "0");

  return (
    <Link
      // NOTE: individual /services/[slug] detail pages don't exist yet in
      // this project — only /services (the index) is a real route. Linking
      // to `/services/${service.slug}` would be a guaranteed 404. Pointing
      // at the Contact section instead ensures the card leads somewhere
      // real. Once detail pages are built, change this back to
      // `/services/${service.slug}`.
      href="/contact"
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-md
        transition-all duration-[280ms] ease-premium-out
        hover:-translate-y-1.5 hover:border-accent-primary/50 hover:bg-white/[0.045]
        hover:shadow-[0_16px_48px_rgba(201,162,75,0.18)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
    >
      {/* Faint large index number, top-right */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-4 font-heading text-5xl text-white/[0.05] transition-colors duration-300 group-hover:text-accent-primary/10"
      >
        {indexLabel}
      </span>

      {/* Subtle gradient sweep on hover, anchored top-left */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(120% 60% at 0% 0%, rgba(201,162,75,0.08) 0%, transparent 55%)",
        }}
      />

      <IconBadge icon={service.icon} size="md" className="relative z-10" />

      <h3 className="relative z-10 mt-6 font-heading text-xl text-text-primary">
        {t("title")}
      </h3>

      <p className="relative z-10 mt-3 text-[15px] leading-relaxed text-text-secondary">
        {t("description")}
      </p>

      {/* Learn more link, arrow slides right on hover */}
      <span className="relative z-10 mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-primary">
        {tCommon("learnMore")}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="rtl:rotate-180 transition-transform duration-300 ease-premium-out group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
          aria-hidden="true"
        >
          <path
            d="M2 7h10M8 3l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  );
}
