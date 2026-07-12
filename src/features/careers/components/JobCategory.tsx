"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import type { JobCategory as JobCategoryType, JobCategoryIcon } from "../types";

interface JobCategoryProps {
  category: JobCategoryType;
}

function CategoryIcon({ icon }: { icon: JobCategoryIcon }) {
  const cls = "h-5 w-5 text-blue-200";
  switch (icon) {
    case "hardHat":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M5 14a7 7 0 1 1 14 0" />
          <path d="M3 14h18M7 14v4m10-4v4" />
        </svg>
      );
    case "compass":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="m9 15 2-6 6-2-2 6-6 2Z" />
        </svg>
      );
    case "pulse":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 12h4l2-4 4 8 2-4h6" />
        </svg>
      );
    case "serviceBell":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 16h12a6 6 0 0 0-12 0Z" />
          <path d="M12 6v2M4 16h16M9 20h6" />
        </svg>
      );
    case "shipment":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 8h12v8H3zM15 11h3l3 3v2h-6z" />
          <circle cx="7" cy="18" r="1.5" />
          <circle cx="18" cy="18" r="1.5" />
        </svg>
      );
    case "factory":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 20V8l5 3V8l5 3V6l8 4v10H3Z" />
        </svg>
      );
    case "briefcase":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="7" width="18" height="12" rx="2" />
          <path d="M9 7V5h6v2M3 12h18" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M9 9h6v6H9z" />
        </svg>
      );
  }
}

export function JobCategory({ category }: JobCategoryProps) {
  const t = useTranslations("careers.categories");

  return (
    <article className="group rounded-2xl border border-white/10 bg-[#0d1624]/85 p-6 transition-all duration-300 hover:border-blue-300/30 hover:bg-[#111d30]/90">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03]">
          <CategoryIcon icon={category.icon} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-200/85">
          {t("openPositions", { count: category.openPositions })}
        </p>
      </div>

      <h3 className={cn("mt-4 font-heading text-[24px] leading-tight text-white")}>{t(`items.${category.id}.title`)}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{t(`items.${category.id}.description`)}</p>
    </article>
  );
}