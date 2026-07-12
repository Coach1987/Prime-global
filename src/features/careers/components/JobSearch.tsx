"use client";

import { useTranslations } from "next-intl";

interface JobSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function JobSearch({ value, onChange }: JobSearchProps) {
  const t = useTranslations("careers.jobs.search");

  return (
    <div className="w-full">
      <label htmlFor="job-search" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
        {t("label")}
      </label>
      <input
        id="job-search"
        name="job-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full rounded-xl border border-white/15 bg-[#0f1a2c] px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-blue-300/50 focus:outline-none"
      />
    </div>
  );
}