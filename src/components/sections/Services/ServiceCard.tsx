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
      href="/services"
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-7 shadow-[0_24px_70px_rgba(3,8,20,0.35)] backdrop-blur-[18px] transition-all duration-500 hover:-translate-y-2 hover:border-blue-300/35 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.13),rgba(255,255,255,0.05))] hover:shadow-[0_32px_90px_rgba(11,31,65,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030814]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(90,166,255,0.14),transparent_42%)] opacity-0 transition-all duration-500 group-hover:opacity-100"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(125deg,transparent_0%,rgba(255,255,255,0.04)_40%,transparent_80%)] opacity-70 transition-all duration-700 group-hover:translate-x-[8%] group-hover:translate-y-[6%]"
      />

      <span className="absolute right-6 top-5 font-heading text-6xl font-bold text-white/[0.05] transition-all duration-500 group-hover:text-blue-300/[0.1]">
        {number}
      </span>

      <div className="relative z-10">
        <IconBadge
          icon={service.icon}
          size="md"
          className="transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <h3 className="relative z-10 mt-7 text-[24px] font-heading font-semibold tracking-tight text-white sm:text-[25px]">
        {t("title")}
      </h3>

      <p className="relative z-10 mt-4 flex-1 text-[15px] leading-7 text-slate-300">
        {t("description")}
      </p>

      <div className="relative z-10 mt-7 h-px bg-gradient-to-r from-blue-400/30 via-blue-200/25 to-transparent" />

      <div className="relative z-10 mt-6 inline-flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-blue-300">
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
