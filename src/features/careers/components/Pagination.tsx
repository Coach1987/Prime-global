"use client";

import { useTranslations } from "next-intl";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const t = useTranslations("careers.jobs.pagination");

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label={t("aria")}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
      >
        {t("previous")}
      </button>

      <p className="text-sm text-slate-300">
        {t("summary", { page, totalPages })}
      </p>

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
      >
        {t("next")}
      </button>
    </nav>
  );
}