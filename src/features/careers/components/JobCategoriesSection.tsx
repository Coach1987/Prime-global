"use client";

import { useTranslations } from "next-intl";
import { mockJobCategories } from "../services";
import { JobCategory } from "./JobCategory";

export function JobCategoriesSection() {
  const t = useTranslations("careers.categories");

  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="job-categories-heading">
      <div className="mb-7 text-center sm:mb-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/90">{t("eyebrow")}</p>
        <h2 id="job-categories-heading" className="mt-3 font-heading text-[30px] text-white sm:text-[40px]">
          {t("title")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{t("description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockJobCategories.map((category) => (
          <JobCategory key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}