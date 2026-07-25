import test from "node:test";
import assert from "node:assert/strict";
import { pickFallbackRecommendedJobs, pickFeaturedJobs } from "./discovery.ts";

const rows = [
  {
    id: "1",
    title: "Published Verified",
    status: "published",
    department: "Logistics",
    employment_type: "full_time",
    country: "Saudi Arabia",
    city: "Riyadh",
    required_skills: ["operations"],
    responsibilities: "Handle operations and planning",
    requirements: "3+ years in logistics",
    publish_date: "2026-07-18T00:00:00.000Z",
    employers: { id: "emp-1", company_name: "Prime Co", verification_status: "verified" },
  },
  {
    id: "2",
    title: "Unpublished",
    status: "draft",
    department: "HR",
    employment_type: "full_time",
    country: "Saudi Arabia",
    city: "Riyadh",
    required_skills: ["hr"],
    responsibilities: "Draft role",
    requirements: "Draft",
    publish_date: "2026-07-18T00:00:00.000Z",
    employers: { id: "emp-1", company_name: "Prime Co", verification_status: "verified" },
  },
  {
    id: "3",
    title: "Unverified Employer",
    status: "published",
    department: "IT",
    employment_type: "full_time",
    country: "Saudi Arabia",
    city: "Riyadh",
    required_skills: ["node"],
    responsibilities: "Support IT",
    requirements: "2+ years",
    publish_date: "2026-07-17T00:00:00.000Z",
    employers: { id: "emp-2", company_name: "Unverified Co", verification_status: "pending_review" },
  },
];

test("featured opportunities include published verified jobs only", () => {
  const featured = pickFeaturedJobs(rows, 10);
  assert.equal(featured.length, 1);
  assert.equal(featured[0].id, "1");
});

test("recommended fallback does not expose fabricated AI score fields", () => {
  const recommended = pickFallbackRecommendedJobs(
    rows,
    {
      country: "Saudi Arabia",
      city: "Riyadh",
      desiredDepartment: "Logistics",
      skills: ["operations"],
    },
    5
  );

  assert.equal(recommended.length, 1);
  assert.equal(Object.hasOwn(recommended[0], "match_score"), false);
  assert.equal(Object.hasOwn(recommended[0], "matchPercentage"), false);
  assert.equal(Object.hasOwn(recommended[0], "aiScore"), false);
});
