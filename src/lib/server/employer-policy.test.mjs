import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { evaluateAgencyPolicy, evaluateJobContactPolicy } from "./employer-policy.ts";

const repoRoot = "/workspaces/Prime-global";

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("agency policy flags staffing agencies in registration/profile fields", () => {
  const violation = evaluateAgencyPolicy({
    companyName: "Acme Staffing Agency",
    industry: "Staffing agency services",
    companyDescription: "We provide third-party recruiter placements.",
  });

  assert.ok(violation);
  assert.equal(violation?.code, "EMPLOYER_AGENCY_PROHIBITED");
  assert.ok(violation?.fieldErrors.companyName);
  assert.ok(violation?.fieldErrors.industry);
  assert.ok(violation?.fieldErrors.companyDescription);
  assert.equal(violation?.localizedFieldErrors.companyName.ar.length > 0, true);
});

test("agency policy flags recruitment agencies in registration/profile fields", () => {
  const violation = evaluateAgencyPolicy({
    companyName: "Acme Recruitment Agency",
    industry: "Recruitment agency services",
    companyDescription: "We source candidates for third-party clients.",
  });

  assert.ok(violation);
  assert.equal(violation?.code, "EMPLOYER_AGENCY_PROHIBITED");
  assert.ok(violation?.fieldErrors.companyName);
  assert.ok(violation?.fieldErrors.industry);
});

test("agency policy allows direct employers with internal hiring teams", () => {
  const violation = evaluateAgencyPolicy({
    companyName: "Prime Manufacturing Group",
    industry: "Industrial production",
    companyDescription: "We hire directly with an internal HR and recruitment team for our operations and facilities.",
  });

  assert.equal(violation, null);
});

test("agency policy rejects profile updates into prohibited agency classification", () => {
  const violation = evaluateAgencyPolicy({
    companyName: "Prime Talent Consultancy",
    industry: "Recruitment agency services",
    companyDescription: "We operate as a staffing agency and third-party recruiter.",
  });

  assert.ok(violation);
  assert.equal(violation?.code, "EMPLOYER_AGENCY_PROHIBITED");
});

test("job contact policy blocks email addresses in job content", () => {
  const violation = evaluateJobContactPolicy({
    title: "Senior Analyst",
    department: "Operations",
    responsibilities: "Send CV to hiring@example.com for review.",
    requirements: "5+ years experience",
    requiredSkills: ["SQL", "Data analysis"],
  });

  assert.ok(violation);
  assert.equal(violation?.code, "JOB_CONTACT_CHANNEL_BLOCKED");
  assert.ok(violation?.fieldErrors.responsibilities);
});

test("job contact policy blocks phone numbers in job content", () => {
  const violation = evaluateJobContactPolicy({
    title: "Senior Analyst",
    department: "Operations",
    responsibilities: "Call +216 55 123 456 for screening details.",
    requirements: "5+ years experience",
    requiredSkills: ["SQL", "Data analysis"],
  });

  assert.ok(violation);
  assert.equal(violation?.code, "JOB_CONTACT_CHANNEL_BLOCKED");
  assert.ok(violation?.fieldErrors.responsibilities);
});

test("job contact policy blocks WhatsApp contact-bypass instructions", () => {
  const violation = evaluateJobContactPolicy({
    title: "Senior Analyst",
    department: "Operations",
    responsibilities: "Please follow the wa.me/123456789 link to bypass the platform and send your resume directly.",
    requirements: "5+ years experience",
    requiredSkills: ["SQL", "Data analysis"],
  });

  assert.ok(violation);
  assert.equal(violation?.code, "JOB_CONTACT_CHANNEL_BLOCKED");
  assert.ok(violation?.fieldErrors.responsibilities);
});

test("published job contact content is rejected", () => {
  const violation = evaluateJobContactPolicy({
    title: "Published Role",
    department: "Operations",
    responsibilities: "Email applicants@example.com to proceed.",
    requirements: "5+ years experience",
    requiredSkills: ["SQL", "Data analysis"],
  });

  assert.ok(violation);
  assert.equal(violation?.code, "JOB_CONTACT_CHANNEL_BLOCKED");
});

test("job update adding contact information is rejected", () => {
  const violation = evaluateJobContactPolicy({
    title: "Updated Role",
    department: "Operations",
    responsibilities: "Reach us on +216 55 123 456 after shortlisting.",
    requirements: "5+ years experience",
    requiredSkills: ["SQL", "Data analysis"],
  });

  assert.ok(violation);
  assert.equal(violation?.code, "JOB_CONTACT_CHANNEL_BLOCKED");
});

test("legitimate job content with salary dates percentages and quantities is allowed", () => {
  const violation = evaluateJobContactPolicy({
    title: "Project Manager",
    department: "Programs",
    responsibilities: "Lead 3 cross-functional teams across Q3 2026 delivery milestones.",
    requirements: "5+ years experience, 80% availability, and 2 prior launches completed.",
    benefits: "Salary range USD two thousand to three thousand, annual bonus, and ten days of onboarding support.",
    requiredSkills: ["Project planning", "Stakeholder management", "Budget oversight"],
  });

  assert.equal(violation, null);
});

test("prohibited agency employers are blocked in job create and update flows", () => {
  const agencyViolation = evaluateAgencyPolicy({
    companyName: "Global Staffing Agency",
    industry: "Recruitment services",
    companyDescription: "We are a labor broker and intermediary for clients.",
  });

  assert.ok(agencyViolation);
  assert.equal(agencyViolation?.code, "EMPLOYER_AGENCY_PROHIBITED");

  const createRoute = readRepoFile("src/app/api/employers/jobs/route.ts");
  const updateRoute = readRepoFile("src/app/api/employers/jobs/[jobId]/route.ts");

  assert.match(createRoute, /evaluateAgencyPolicy/);
  assert.match(createRoute, /agencyViolation/);
  assert.match(updateRoute, /evaluateAgencyPolicy/);
  assert.match(updateRoute, /agencyViolation/);
});