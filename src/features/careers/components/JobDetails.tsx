"use client";

import { useTranslations } from "next-intl";
import type { JobListing } from "../types";

interface JobDetailsProps {
  job: JobListing;
}

export function JobDetails({ job }: JobDetailsProps) {
  const t = useTranslations("careers.jobs");

  return (
    <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-2">
      <section aria-labelledby={`${job.id}-responsibilities`}>
        <h4 id={`${job.id}-responsibilities`} className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-200">
          {t("details.responsibilities")}
        </h4>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
          {job.responsibilitiesKeys.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{t(item)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`${job.id}-requirements`}>
        <h4 id={`${job.id}-requirements`} className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-200">
          {t("details.requirements")}
        </h4>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
          {job.requirementsKeys.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <span>{t(item)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}