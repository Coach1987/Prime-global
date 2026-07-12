"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { JobListing } from "../types";
import { JobDetails } from "./JobDetails";

interface JobCardProps {
  job: JobListing;
}

export function JobCard({ job }: JobCardProps) {
  const t = useTranslations("careers.jobs");

  return (
    <article className="rounded-2xl border border-white/10 bg-[#0e1929]/80 p-6 shadow-[0_14px_42px_rgba(2,9,19,0.38)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-[26px] leading-tight text-white">{t(job.titleKey)}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{t(job.summaryKey)}</p>
        </div>

        {job.featured && (
          <span className="rounded-full border border-gold/35 bg-gold/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-bright">
            {t("featured")}
          </span>
        )}
      </header>

      <dl className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{t("meta.location")}</dt>
          <dd className="mt-1 text-slate-200">{job.locationCity}, {job.locationCountry}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{t("meta.workType")}</dt>
          <dd className="mt-1 text-slate-200">{t(`filters.locationOptions.${job.locationType}`)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{t("meta.employment")}</dt>
          <dd className="mt-1 text-slate-200">{t(`filters.employmentOptions.${job.employmentType}`)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{t("meta.level")}</dt>
          <dd className="mt-1 text-slate-200">{t(`filters.experienceOptions.${job.experienceLevel}`)}</dd>
        </div>
      </dl>

      <details className="group mt-4 rounded-xl border border-white/10 bg-[#101d30]/60 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-blue-200 marker:hidden">
          {t("details.toggle")}
        </summary>
        <JobDetails job={job} />
      </details>

      <div className="mt-5">
        <Link
          href="/careers/apply"
          className="inline-flex items-center gap-2 rounded-full border border-blue-300/35 px-5 py-2.5 text-sm font-semibold text-blue-100 transition-colors duration-300 hover:border-blue-200/55 hover:text-white"
        >
          {t("applyNow")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}