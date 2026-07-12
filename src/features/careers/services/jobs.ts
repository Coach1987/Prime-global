import type { JobFiltersState, JobListing, PaginationState } from "../types";

export function filterJobs(listings: JobListing[], query: string, filters: JobFiltersState) {
  const normalizedQuery = query.trim().toLowerCase();

  return listings.filter((job) => {
    if (filters.category !== "all" && job.categoryId !== filters.category) {
      return false;
    }

    if (filters.locationType !== "all" && job.locationType !== filters.locationType) {
      return false;
    }

    if (filters.employmentType !== "all" && job.employmentType !== filters.employmentType) {
      return false;
    }

    if (filters.experienceLevel !== "all" && job.experienceLevel !== filters.experienceLevel) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [job.id, job.titleKey, job.locationCity, job.locationCountry]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function paginateJobs(listings: JobListing[], pagination: PaginationState) {
  const start = (pagination.page - 1) * pagination.pageSize;
  return listings.slice(start, start + pagination.pageSize);
}

export function getTotalPages(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}