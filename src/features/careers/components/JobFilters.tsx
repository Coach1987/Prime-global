"use client";

import { useTranslations } from "next-intl";
import type { JobFiltersState } from "../types";

interface JobFiltersProps {
  filters: JobFiltersState;
  onChange: (next: JobFiltersState) => void;
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/15 bg-[#0f1a2c] px-3 py-3 text-sm text-white focus:border-blue-300/50 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function JobFilters({ filters, onChange }: JobFiltersProps) {
  const t = useTranslations("careers.jobs.filters");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FilterSelect
        id="job-filter-category"
        label={t("category")}
        value={filters.category}
        onChange={(category) => onChange({ ...filters, category: category as JobFiltersState["category"] })}
        options={[
          { value: "all", label: t("all") },
          { value: "construction", label: t("categoryOptions.construction") },
          { value: "engineering", label: t("categoryOptions.engineering") },
          { value: "healthcare", label: t("categoryOptions.healthcare") },
          { value: "hospitality", label: t("categoryOptions.hospitality") },
          { value: "logistics", label: t("categoryOptions.logistics") },
          { value: "manufacturing", label: t("categoryOptions.manufacturing") },
          { value: "administration", label: t("categoryOptions.administration") },
          { value: "technology", label: t("categoryOptions.technology") },
        ]}
      />

      <FilterSelect
        id="job-filter-location"
        label={t("locationType")}
        value={filters.locationType}
        onChange={(locationType) => onChange({ ...filters, locationType: locationType as JobFiltersState["locationType"] })}
        options={[
          { value: "all", label: t("all") },
          { value: "onSite", label: t("locationOptions.onSite") },
          { value: "hybrid", label: t("locationOptions.hybrid") },
          { value: "remote", label: t("locationOptions.remote") },
        ]}
      />

      <FilterSelect
        id="job-filter-employment"
        label={t("employmentType")}
        value={filters.employmentType}
        onChange={(employmentType) => onChange({ ...filters, employmentType: employmentType as JobFiltersState["employmentType"] })}
        options={[
          { value: "all", label: t("all") },
          { value: "fullTime", label: t("employmentOptions.fullTime") },
          { value: "contract", label: t("employmentOptions.contract") },
          { value: "temporary", label: t("employmentOptions.temporary") },
        ]}
      />

      <FilterSelect
        id="job-filter-level"
        label={t("experience")}
        value={filters.experienceLevel}
        onChange={(experienceLevel) => onChange({ ...filters, experienceLevel: experienceLevel as JobFiltersState["experienceLevel"] })}
        options={[
          { value: "all", label: t("all") },
          { value: "entry", label: t("experienceOptions.entry") },
          { value: "mid", label: t("experienceOptions.mid") },
          { value: "senior", label: t("experienceOptions.senior") },
        ]}
      />
    </div>
  );
}