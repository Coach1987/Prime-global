"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { IconBadge } from "@/components/ui/IconBadge";
import type { ServiceItem } from "@/lib/constants/services";

interface ServiceCardProps {
  service: ServiceItem;
  index: number;
}

export function ServiceCard({
  service,
  index,
}: ServiceCardProps) {

  const t = useTranslations(`services.items.${service.key}`);
  const common = useTranslations("services");

  const number = String(index + 1).padStart(2, "0");

  return (
    <Link
      href="/contact"
      className="
      group
      relative
      flex
      h-full
      flex-col
      overflow-hidden
      rounded-[28px]
      border
      border-white/10
      bg-gradient-to-b
      from-white/[0.05]
      to-white/[0.02]
      p-8
      backdrop-blur-2xl
      transition-all
      duration-500
      hover:-translate-y-3
      hover:border-blue-400/40
      hover:shadow-[0_30px_80px_rgba(20,90,180,0.22)]
      "
    >

      {/* Ambient light */}
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl transition-all duration-500 group-hover:bg-blue-400/20"
      />

      {/* Card Number */}
      <span
        className="
        absolute
        right-7
        top-5
        font-heading
        text-6xl
        font-bold
        text-white/[0.035]
        transition-all
        duration-500
        group-hover:text-blue-300/[0.08]
        "
      >
        {number}
      </span>

      {/* Icon */}
      <div className="relative z-10">
        <IconBadge
          icon={service.icon}
          size="md"
          className="transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Title */}
      <h3
        className="
        relative
        z-10
        mt-7
        text-[25px]
        font-heading
        font-semibold
        tracking-tight
        text-white
        "
      >
        {t("title")}
      </h3>

      {/* Description */}
      <p
        className="
        relative
        z-10
        mt-4
        flex-1
        text-[15px]
        leading-7
        text-slate-300
        "
      >
        {t("description")}
      </p>

      {/* Divider */}
      <div className="relative z-10 mt-7 h-px bg-gradient-to-r from-blue-400/30 to-transparent" />

      {/* CTA */}
      <div
        className="
        relative
        z-10
        mt-6
        inline-flex
        items-center
        gap-3
        text-[14px]
        font-semibold
        uppercase
        tracking-[0.18em]
        text-blue-300
        "
      >
        {common("learnMore")}

        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="transition-transform duration-500 group-hover:translate-x-2 rtl:rotate-180 rtl:group-hover:-translate-x-2"
        >
          <path
            d="M3 9h12M10 4l5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

      </div>

    </Link>
  );
}
