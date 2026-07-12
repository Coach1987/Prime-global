export type JobCategoryId =
  | "construction"
  | "engineering"
  | "healthcare"
  | "hospitality"
  | "logistics"
  | "manufacturing"
  | "administration"
  | "technology";

export type JobCategoryIcon =
  | "hardHat"
  | "compass"
  | "pulse"
  | "serviceBell"
  | "shipment"
  | "factory"
  | "briefcase"
  | "chip";

export interface JobCategory {
  id: JobCategoryId;
  icon: JobCategoryIcon;
  openPositions: number;
}

export type JobEmploymentType = "fullTime" | "contract" | "temporary";

export type JobExperienceLevel = "entry" | "mid" | "senior";

export interface JobListing {
  id: string;
  categoryId: JobCategoryId;
  titleKey: string;
  summaryKey: string;
  locationCountry: string;
  locationCity: string;
  locationType: "onSite" | "hybrid" | "remote";
  employmentType: JobEmploymentType;
  experienceLevel: JobExperienceLevel;
  postedAt: string;
  featured?: boolean;
  responsibilitiesKeys: string[];
  requirementsKeys: string[];
}

export interface JobFiltersState {
  category: JobCategoryId | "all";
  locationType: JobListing["locationType"] | "all";
  employmentType: JobEmploymentType | "all";
  experienceLevel: JobExperienceLevel | "all";
}

export interface PaginationState {
  page: number;
  pageSize: number;
}