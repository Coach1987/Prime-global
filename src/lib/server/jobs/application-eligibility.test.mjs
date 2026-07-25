import test from "node:test";
import assert from "node:assert/strict";
import { evaluateApplicationEligibility } from "./application-eligibility.ts";

function completeProfile() {
  return {
    completed: true,
    completionPercent: 100,
    requirements: [
      { key: "cv", completed: true },
      { key: "diploma", completed: true },
    ],
    missing: [],
  };
}

test("employer cannot apply as candidate", () => {
  const result = evaluateApplicationEligibility({
    role: "employer",
    candidateFound: true,
    jobFound: true,
    jobStatus: "published",
    jobApplicationDeadline: null,
    profileCompletion: completeProfile(),
    duplicateApplicationId: null,
    locale: "en",
    returnTo: "/en/jobs/abc?applyIntent=1",
  });

  assert.equal(result.code, "ROLE_NOT_ELIGIBLE");
});

test("staff cannot apply as candidate", () => {
  const result = evaluateApplicationEligibility({
    role: "prime_global_admin",
    candidateFound: true,
    jobFound: true,
    jobStatus: "published",
    jobApplicationDeadline: null,
    profileCompletion: completeProfile(),
    duplicateApplicationId: null,
    locale: "en",
    returnTo: "/en/jobs/abc?applyIntent=1",
  });

  assert.equal(result.code, "ROLE_NOT_ELIGIBLE");
});

test("incomplete candidate receives onboarding redirect", () => {
  const result = evaluateApplicationEligibility({
    role: "candidate",
    candidateFound: true,
    jobFound: true,
    jobStatus: "published",
    jobApplicationDeadline: null,
    profileCompletion: {
      completed: false,
      completionPercent: 35,
      requirements: [
        { key: "cv", completed: false },
        { key: "diploma", completed: false },
      ],
      missing: ["cv", "diploma"],
    },
    duplicateApplicationId: null,
    locale: "en",
    returnTo: "/en/jobs/abc?applyIntent=1",
  });

  assert.equal(result.code, "CANDIDATE_PROFILE_INCOMPLETE");
  assert.equal(
    result.onboardingRedirect,
    "/en/candidate/onboarding?returnTo=%2Fen%2Fjobs%2Fabc%3FapplyIntent%3D1"
  );
});

test("eligible candidate reaches confirmation state", () => {
  const result = evaluateApplicationEligibility({
    role: "candidate",
    candidateFound: true,
    jobFound: true,
    jobStatus: "published",
    jobApplicationDeadline: null,
    profileCompletion: completeProfile(),
    duplicateApplicationId: null,
    locale: "en",
    returnTo: "/en/jobs/abc?applyIntent=1",
  });

  assert.equal(result.code, "ELIGIBLE");
  assert.equal(result.eligible, true);
});

test("unpublished jobs cannot be applied to", () => {
  const result = evaluateApplicationEligibility({
    role: "candidate",
    candidateFound: true,
    jobFound: true,
    jobStatus: "draft",
    jobApplicationDeadline: null,
    profileCompletion: completeProfile(),
    duplicateApplicationId: null,
    locale: "en",
    returnTo: "/en/jobs/abc?applyIntent=1",
  });

  assert.equal(result.code, "JOB_NOT_AVAILABLE");
});

test("jobs past deadline cannot be applied to", () => {
  const result = evaluateApplicationEligibility({
    role: "candidate",
    candidateFound: true,
    jobFound: true,
    jobStatus: "published",
    jobApplicationDeadline: "2020-01-01T00:00:00.000Z",
    profileCompletion: completeProfile(),
    duplicateApplicationId: null,
    locale: "en",
    returnTo: "/en/jobs/abc?applyIntent=1",
  });

  assert.equal(result.code, "JOB_NOT_ACTIVE");
});

test("duplicate applications are blocked", () => {
  const result = evaluateApplicationEligibility({
    role: "candidate",
    candidateFound: true,
    jobFound: true,
    jobStatus: "published",
    jobApplicationDeadline: null,
    profileCompletion: completeProfile(),
    duplicateApplicationId: "existing-id",
    locale: "en",
    returnTo: "/en/jobs/abc?applyIntent=1",
  });

  assert.equal(result.code, "DUPLICATE_APPLICATION");
});
