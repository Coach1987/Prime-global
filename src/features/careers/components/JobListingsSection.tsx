"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { filterJobs, getTotalPages, mockJobListings, paginateJobs } from "../services";
import type { JobFiltersState } from "../types";
import { JobCard } from "./JobCard";
import { JobFilters } from "./JobFilters";
import { JobSearch } from "./JobSearch";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 3;

const INITIAL_FILTERS: JobFiltersState = {
  category: "all",
  locationType: "all",
  employmentType: "all",
  experienceLevel: "all",
};

export function JobListingsSection() {
  const t = useTranslations("careers.jobs");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<JobFiltersState>(INITIAL_FILTERS);

  const filteredJobs = useMemo(() => filterJobs(mockJobListings, search, filters), [filters, search]);
  const totalPages = getTotalPages(filteredJobs.length, PAGE_SIZE);
  const paginatedJobs = paginateJobs(filteredJobs, { page, pageSize: PAGE_SIZE });

  function onFiltersChange(next: JobFiltersState) {
    setPage(1);
    setFilters(next);
  }

  function onSearchChange(next: string) {
    setPage(1);
    setSearch(next);
  }

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="job-listings-heading">
      <div className="mb-7 text-center sm:mb-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/90">{t("eyebrow")}</p>
        <h2 id="job-listings-heading" className="mt-3 font-heading text-[30px] text-white sm:text-[40px]">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{t("description")}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d1624]/75 p-4 sm:p-6">
        <div className="grid gap-4">
          <JobSearch value={search} onChange={onSearchChange} />
          <JobFilters filters={filters} onChange={onFiltersChange} />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {paginatedJobs.length > 0 ? (
          paginatedJobs.map((job) => <JobCard key={job.id} job={job} />)
        ) : (
          <p className="rounded-2xl border border-dashed border-white/20 px-6 py-10 text-center text-sm text-slate-300">
            {t("emptyState")}
          </p>
        )}
      </div>

      <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}