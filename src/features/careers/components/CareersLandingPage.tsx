"use client";

import { CareersHero } from "./CareersHero";
import { CareersInfoSections } from "./CareersInfoSections";
import { JobCategoriesSection } from "./JobCategoriesSection";
import { JobListingsSection } from "./JobListingsSection";

export function CareersLandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1260px] px-4 pb-16 pt-6 sm:px-6 sm:pb-20 md:px-8 md:pt-8">
      <CareersHero />
      <CareersInfoSections />
      <JobCategoriesSection />
      <JobListingsSection />
    </div>
  );
}