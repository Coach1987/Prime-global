"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";

type PublicJob = {
  id: string;
  title: string;
  country: string | null;
  city: string | null;
  department: string | null;
  employment_type: string | null;
  work_mode: string | null;
  required_skills: string[];
  publish_date: string | null;
  summary: string;
  company_display_name: string | null;
};

type JobsResponse = {
  success: boolean;
  data?: PublicJob[];
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: {
    message?: string;
  };
};

type SearchFormState = {
  q: string;
  country: string;
  city: string;
  category: string;
  specialization: string;
  employmentType: string;
};

const PAGE_SIZE = 12;

function readFormState(searchParams: URLSearchParams): SearchFormState {
  return {
    q: searchParams.get("q") ?? "",
    country: searchParams.get("country") ?? "",
    city: searchParams.get("city") ?? "",
    category: searchParams.get("category") ?? "",
    specialization: searchParams.get("specialization") ?? "",
    employmentType: searchParams.get("employmentType") ?? "",
  };
}

function buildSearchParams(form: SearchFormState, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (form.q.trim()) params.set("q", form.q.trim());
  if (form.country.trim()) params.set("country", form.country.trim());
  if (form.city.trim()) params.set("city", form.city.trim());
  if (form.category.trim()) params.set("category", form.category.trim());
  if (form.specialization.trim()) params.set("specialization", form.specialization.trim());
  if (form.employmentType.trim()) params.set("employmentType", form.employmentType.trim());
  params.set("page", String(Math.max(1, page)));
  params.set("pageSize", String(PAGE_SIZE));
  return params;
}

function toEmploymentLabel(value: string | null, isArabic: boolean): string {
  if (!value) return isArabic ? "غير محدد" : "Not specified";

  const map: Record<string, { en: string; ar: string }> = {
    full_time: { en: "Full-time", ar: "دوام كامل" },
    part_time: { en: "Part-time", ar: "دوام جزئي" },
    contract: { en: "Contract", ar: "عقد" },
    internship: { en: "Internship", ar: "تدريب" },
  };

  const label = map[value];
  if (label) return isArabic ? label.ar : label.en;

  return value.replace(/_/g, " ");
}

export function PublicJobsSearchPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const copy = useMemo(
    () =>
      isArabic
        ? {
            title: "ابحث عن الوظائف",
            description: "ابحث باستخدام الكلمات المفتاحية أو الدولة أو المدينة أو التخصص، ثم صفِّ النتائج بسرعة.",
            searchLabel: "كلمة مفتاحية",
            searchPlaceholder: "مثال: مدرب لياقة، fitness، logistics",
            countryLabel: "الدولة",
            countryPlaceholder: "مثال: السعودية",
            cityLabel: "المدينة",
            cityPlaceholder: "مثال: الرياض",
            categoryLabel: "الفئة أو المجال",
            categoryPlaceholder: "مثال: رياضة، لوجستيات، محاسبة",
            specializationLabel: "التخصص",
            specializationPlaceholder: "مثال: Strength and Conditioning",
            employmentTypeLabel: "نوع التوظيف",
            allEmploymentTypes: "كل أنواع التوظيف",
            filterAction: "بحث",
            clearAction: "مسح الفلاتر",
            loading: "جاري تحميل الوظائف...",
            resultCount: "عدد النتائج",
            empty: "لا توجد وظائف مطابقة للبحث الحالي. جرّب تعديل الكلمات أو الفلاتر.",
            error: "تعذر تحميل الوظائف حالياً. حاول مرة أخرى.",
            locationUnknown: "الموقع غير محدد",
            companyFallback: "شركة معتمدة",
            categoryFallback: "بدون تصنيف",
            publishedAt: "تاريخ النشر",
            viewJob: "عرض الوظيفة",
            previous: "السابق",
            next: "التالي",
            pageLabel: "الصفحة",
            skillsLabel: "المهارات",
          }
        : {
            title: "Find Jobs",
            description: "Search by keyword, country, city, category, and specialization with multilingual matching.",
            searchLabel: "Keyword",
            searchPlaceholder: "Example: fitness trainer, رياضة, logistics",
            countryLabel: "Country",
            countryPlaceholder: "Example: Saudi Arabia",
            cityLabel: "City",
            cityPlaceholder: "Example: Riyadh",
            categoryLabel: "Category or domain",
            categoryPlaceholder: "Example: sports, logistics, accounting",
            specializationLabel: "Specialization",
            specializationPlaceholder: "Example: Strength and Conditioning",
            employmentTypeLabel: "Employment type",
            allEmploymentTypes: "All employment types",
            filterAction: "Search",
            clearAction: "Clear filters",
            loading: "Loading jobs...",
            resultCount: "Results",
            empty: "No jobs match the current search. Try different keywords or filters.",
            error: "Unable to load jobs right now. Please try again.",
            locationUnknown: "Location not specified",
            companyFallback: "Verified employer",
            categoryFallback: "Uncategorized",
            publishedAt: "Published",
            viewJob: "View Job",
            previous: "Previous",
            next: "Next",
            pageLabel: "Page",
            skillsLabel: "Skills",
          },
    [isArabic]
  );

  const [form, setForm] = useState<SearchFormState>(() => readFormState(searchParams));
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 });

  useEffect(() => {
    setForm(readFormState(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(searchParams.toString());
        if (!params.get("page")) params.set("page", "1");
        if (!params.get("pageSize")) params.set("pageSize", String(PAGE_SIZE));

        const response = await fetch(`/api/jobs?${params.toString()}`);
        const payload = (await response.json()) as JobsResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message ?? copy.error);
        }

        if (cancelled) return;

        setJobs(payload.data ?? []);
        setPagination(
          payload.pagination ?? {
            page: 1,
            pageSize: PAGE_SIZE,
            totalItems: 0,
            totalPages: 0,
          }
        );
      } catch (fetchError) {
        if (cancelled) return;
        setJobs([]);
        setPagination({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 0 });
        setError(fetchError instanceof Error ? fetchError.message : copy.error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadJobs().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [copy.error, searchParams]);

  function pushWithParams(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushWithParams(buildSearchParams(form, 1));
  }

  function clearFilters() {
    pushWithParams(new URLSearchParams([["page", "1"], ["pageSize", String(PAGE_SIZE)]]));
  }

  function goToPage(nextPage: number) {
    const current = buildSearchParams(form, nextPage);
    pushWithParams(current);
  }

  const hasPrevious = pagination.page > 1;
  const hasNext = pagination.page < pagination.totalPages;

  return (
    <main className="mx-auto w-full max-w-[1260px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-6 backdrop-blur-xl md:p-10">
        <div className={isArabic ? "text-right" : "text-left"}>
          <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
          <p className="mt-3 text-sm text-text-secondary">{copy.description}</p>
        </div>

        <form className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{copy.searchLabel}</span>
            <input
              type="search"
              value={form.q}
              onChange={(event) => setForm((prev) => ({ ...prev, q: event.target.value }))}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{copy.countryLabel}</span>
            <input
              value={form.country}
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
              placeholder={copy.countryPlaceholder}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{copy.cityLabel}</span>
            <input
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              placeholder={copy.cityPlaceholder}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{copy.categoryLabel}</span>
            <input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder={copy.categoryPlaceholder}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{copy.specializationLabel}</span>
            <input
              value={form.specialization}
              onChange={(event) => setForm((prev) => ({ ...prev, specialization: event.target.value }))}
              placeholder={copy.specializationPlaceholder}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">{copy.employmentTypeLabel}</span>
            <select
              value={form.employmentType}
              onChange={(event) => setForm((prev) => ({ ...prev, employmentType: event.target.value }))}
              className="w-full rounded-xl border border-gold/20 bg-bg-primary px-4 py-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
            >
              <option value="">{copy.allEmploymentTypes}</option>
              <option value="full_time">{toEmploymentLabel("full_time", isArabic)}</option>
              <option value="part_time">{toEmploymentLabel("part_time", isArabic)}</option>
              <option value="contract">{toEmploymentLabel("contract", isArabic)}</option>
              <option value="internship">{toEmploymentLabel("internship", isArabic)}</option>
            </select>
          </label>

          <div className="md:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
            <button className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary" type="submit">
              {copy.filterAction}
            </button>
            <button
              className="rounded-xl border border-gold/30 px-5 py-3 text-sm font-semibold text-gold hover:bg-gold/10"
              type="button"
              onClick={clearFilters}
            >
              {copy.clearAction}
            </button>
          </div>
        </form>

        <p aria-live="polite" className="mt-6 text-sm text-text-secondary">
          {copy.resultCount}: <span className="font-semibold text-text-primary">{pagination.totalItems}</span>
        </p>

        {loading ? <p className="mt-6 text-sm text-text-secondary">{copy.loading}</p> : null}
        {error ? <p className="mt-6 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        {!loading && !error && jobs.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-gold/30 px-6 py-10 text-center text-sm text-text-secondary">
            {copy.empty}
          </p>
        ) : null}

        {!loading && !error && jobs.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {jobs.map((job) => {
              const location = [job.city, job.country].filter(Boolean).join(", ") || copy.locationUnknown;
              const skills = (job.required_skills ?? []).slice(0, 4);

              return (
                <article key={job.id} className="rounded-2xl border border-gold/20 bg-bg-primary/70 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-gold">{job.company_display_name ?? copy.companyFallback}</p>
                  <h2 className="mt-3 font-heading text-2xl text-text-primary">{job.title}</h2>
                  <p className="mt-2 text-sm text-text-secondary">{location}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-tertiary">
                    {job.department ?? copy.categoryFallback} • {toEmploymentLabel(job.employment_type, isArabic)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{job.summary}</p>

                  {skills.length > 0 ? (
                    <p className="mt-3 text-xs text-text-tertiary">
                      {copy.skillsLabel}: {skills.join(" • ")}
                    </p>
                  ) : null}

                  <p className="mt-3 text-xs text-text-tertiary">
                    {copy.publishedAt}: {job.publish_date ? new Date(job.publish_date).toLocaleDateString(locale) : "-"}
                  </p>

                  <div className="mt-4">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex items-center rounded-full border border-blue-300/35 px-5 py-2 text-sm font-semibold text-blue-100 transition-colors hover:border-blue-200/55 hover:text-white"
                    >
                      {copy.viewJob}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && !error && pagination.totalPages > 1 ? (
          <nav className="mt-8 flex flex-wrap items-center gap-3" aria-label={copy.pageLabel}>
            <button
              type="button"
              disabled={!hasPrevious}
              onClick={() => goToPage(pagination.page - 1)}
              className="rounded-lg border border-gold/30 px-4 py-2 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.previous}
            </button>
            <span className="text-sm text-text-secondary">
              {copy.pageLabel} {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => goToPage(pagination.page + 1)}
              className="rounded-lg border border-gold/30 px-4 py-2 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copy.next}
            </button>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
