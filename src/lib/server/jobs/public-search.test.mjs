import test from "node:test";
import assert from "node:assert/strict";

import {
  expandOccupationalTerms,
  filterAndRankPublicJobs,
  normalizeSearchText,
} from "./public-search.ts";
import { listPublicJobsQuerySchema } from "../../../features/jobs/schemas/job.ts";

const BASE_EMPLOYER = {
  id: "emp-1",
  company_name: "Prime Fit",
  industry: "Sports",
  verification_status: "verified",
};

const SAMPLE_JOBS = [
  {
    id: "job-1",
    status: "published",
    title: "Fitness Trainer",
    department: "Sports Coaching",
    country: "Saudi Arabia",
    city: "Riyadh",
    employment_type: "full_time",
    work_mode: "onsite",
    required_skills: ["fitness", "coaching", "strength programming"],
    responsibilities: "Train members in fitness plans and sports conditioning",
    requirements: "Experience as a personal trainer",
    publish_date: "2026-07-18T00:00:00.000Z",
    employers: BASE_EMPLOYER,
  },
  {
    id: "job-2",
    status: "published",
    title: "Personal Trainer",
    department: "Gym Team",
    country: "Saudi Arabia",
    city: "Jeddah",
    employment_type: "full_time",
    work_mode: "onsite",
    required_skills: ["gym", "fitness", "rehab"],
    responsibilities: "Coach members and deliver training sessions",
    requirements: "Certified trainer",
    publish_date: "2026-07-16T00:00:00.000Z",
    employers: BASE_EMPLOYER,
  },
  {
    id: "job-3",
    status: "published",
    title: "مدرب رياضي",
    department: "لياقة بدنية",
    country: "Saudi Arabia",
    city: "Riyadh",
    employment_type: "contract",
    work_mode: "onsite",
    required_skills: ["رياضة", "لياقة", "تدريب"],
    responsibilities: "تدريب العملاء على التمارين الرياضية",
    requirements: "خبرة كمدرب",
    publish_date: "2026-07-15T00:00:00.000Z",
    employers: BASE_EMPLOYER,
  },
  {
    id: "job-4",
    status: "published",
    title: "Warehouse Coordinator",
    department: "Logistics",
    country: "United Arab Emirates",
    city: "Dubai",
    employment_type: "full_time",
    work_mode: "onsite",
    required_skills: ["inventory", "warehouse"],
    responsibilities: "Coordinate shipments and stock flow",
    requirements: "Logistics background",
    publish_date: "2026-07-17T00:00:00.000Z",
    employers: BASE_EMPLOYER,
  },
  {
    id: "job-5",
    status: "draft",
    title: "Sports Coach",
    department: "Sports",
    country: "Saudi Arabia",
    city: "Riyadh",
    employment_type: "full_time",
    work_mode: "onsite",
    required_skills: ["sports", "coaching"],
    responsibilities: "Coach teams",
    requirements: "Experience",
    publish_date: "2026-07-19T00:00:00.000Z",
    employers: BASE_EMPLOYER,
  },
];

test("normalizes English punctuation and casing", () => {
  const normalized = normalizeSearchText("  Fitness---Trainer!!!  ");
  assert.equal(normalized, "fitness trainer");
});

test("normalizes Arabic letter variants", () => {
  const normalized = normalizeSearchText("إدَارَة");
  assert.equal(normalized, "اداره");
});

test("expands synonyms for fitness and arabic sports terms", () => {
  const terms = expandOccupationalTerms({ q: "fitness" });
  assert.ok(terms.includes("personal trainer"));
  assert.ok(terms.includes("رياضه"));

  const arabicTerms = expandOccupationalTerms({ q: "رياضة" });
  assert.ok(arabicTerms.includes("fitness"));
  assert.ok(arabicTerms.includes("مدرب"));
});

test("fitness query matches sports and trainer jobs", () => {
  const results = filterAndRankPublicJobs(SAMPLE_JOBS, { q: "fitness" });
  const ids = results.map((item) => item.row.id);

  assert.ok(ids.includes("job-1"));
  assert.ok(ids.includes("job-2"));
  assert.ok(ids.includes("job-3"));
  assert.ok(!ids.includes("job-4"));
});

test("arabic sports query matches relevant jobs", () => {
  const results = filterAndRankPublicJobs(SAMPLE_JOBS, { q: "رياضة" });
  const ids = results.map((item) => item.row.id);

  assert.ok(ids.includes("job-1"));
  assert.ok(ids.includes("job-3"));
});

test("arabic trainer query matches coach/trainer roles", () => {
  const results = filterAndRankPublicJobs(SAMPLE_JOBS, { q: "مدرب" });
  const ids = results.map((item) => item.row.id);

  assert.ok(ids.includes("job-1"));
  assert.ok(ids.includes("job-2"));
  assert.ok(ids.includes("job-3"));
});

test("strict country and city filtering are respected", () => {
  const countryOnly = filterAndRankPublicJobs(SAMPLE_JOBS, { country: "Saudi" });
  assert.equal(countryOnly.every((item) => item.row.country === "Saudi Arabia"), true);

  const cityOnly = filterAndRankPublicJobs(SAMPLE_JOBS, { city: "Riyadh" });
  assert.equal(cityOnly.every((item) => item.row.city === "Riyadh"), true);

  const combined = filterAndRankPublicJobs(SAMPLE_JOBS, { q: "fitness", country: "Saudi", city: "Riyadh" });
  assert.equal(combined.every((item) => item.row.country === "Saudi Arabia" && item.row.city === "Riyadh"), true);
});

test("exact title match ranks before partial matches", () => {
  const results = filterAndRankPublicJobs(SAMPLE_JOBS, { q: "Fitness Trainer" });
  assert.equal(results[0]?.row.id, "job-1");
});

test("unpublished jobs are excluded", () => {
  const results = filterAndRankPublicJobs(SAMPLE_JOBS, { q: "sports" });
  const ids = results.map((item) => item.row.id);
  assert.equal(ids.includes("job-5"), false);
});

test("empty query returns published verified jobs", () => {
  const results = filterAndRankPublicJobs(SAMPLE_JOBS, {});
  assert.equal(results.some((item) => item.row.id === "job-5"), false);
  assert.ok(results.length >= 4);
});

test("unsafe characters do not break matching", () => {
  const results = filterAndRankPublicJobs(SAMPLE_JOBS, { q: "fitness%'_" });
  assert.ok(results.length >= 1);
});

test("localized query parameters parse correctly", () => {
  const parsed = listPublicJobsQuerySchema.safeParse({
    q: "رياضة",
    country: "المملكة العربية السعودية",
    city: "الرياض",
    page: "2",
    pageSize: "12",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.q, "رياضة");
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.pageSize, 12);
});
