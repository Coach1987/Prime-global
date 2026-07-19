import test from "node:test";
import assert from "node:assert/strict";
import { consolidateCandidateProfile } from "./canonicalization.ts";
import { canonicalizeSkillKey, normalizeSkill } from "./normalization.ts";
import { evaluateAdvisoryRecommendation } from "./review.ts";
import { buildCandidateTimeline } from "./timeline.ts";

test("skill normalization handles aliases and multilingual variants", () => {
  const taxonomy = [
    {
      id: "tax_js",
      canonical_code: "javascript",
      canonical_name: "JavaScript",
      category: "programming",
      locale: "en",
      normalized_key: canonicalizeSkillKey("JavaScript"),
      metadata: {},
      is_active: true,
      created_at: "2026-07-18T00:00:00Z",
      updated_at: "2026-07-18T00:00:00Z",
    },
  ];

  const aliases = [
    {
      id: "alias_js",
      taxonomy_id: "tax_js",
      alias_text: "Java Script",
      locale: "en",
      normalized_key: canonicalizeSkillKey("Java Script"),
      metadata: {},
      is_active: true,
      created_at: "2026-07-18T00:00:00Z",
      updated_at: "2026-07-18T00:00:00Z",
    },
  ];

  const normalized = normalizeSkill({ rawSkill: "Java Script", taxonomy, aliases });
  assert.equal(normalized.matchedTaxonomyId, "tax_js");
  assert.equal(normalized.normalizedSkillName, "JavaScript");
});

test("timeline builder returns chronologically sorted entries", () => {
  const timeline = buildCandidateTimeline([
    { entryType: "experience", title: "Role B", description: "", startDate: "2024-01-01" },
    { entryType: "education", title: "Role A", description: "", startDate: "2020-01-01" },
  ]);

  assert.equal(timeline[0].title, "Role A");
  assert.equal(timeline[1].title, "Role B");
});

test("advisory recommendation remains non-final and reviewable", () => {
  const high = evaluateAdvisoryRecommendation({ overallConfidence: 0.9, needsManualReview: false });
  assert.equal(high.recommendation, "advisory_fit");
  assert.equal(high.reviewStatus, "pending_review");

  const low = evaluateAdvisoryRecommendation({ overallConfidence: 0.3, needsManualReview: false });
  assert.equal(low.recommendation, "advisory_low_confidence");
  assert.equal(low.reviewStatus, "needs_manual_review");
});

test("canonicalization merges duplicate skill values while preserving evidence", () => {
  const result = consolidateCandidateProfile({
    profileDraft: { headline: "Senior Backend Engineer", summary: "Profile summary" },
    skills: [
      {
        id: "skill_1",
        profile_id: "profile_1",
        candidate_id: "candidate_1",
        raw_skill: "Node.js",
        normalized_taxonomy_id: null,
        normalized_skill_name: "Node.js",
        proficiency_level: "advanced",
        confidence_score: 0.9,
        extraction_source: "ocr",
        document_reference: "cv.pdf",
        ai_model_used: "model-a",
        extraction_timestamp: "2026-07-19T00:00:00Z",
        metadata: {},
        created_at: "2026-07-19T00:00:00Z",
      },
      {
        id: "skill_2",
        profile_id: "profile_1",
        candidate_id: "candidate_1",
        raw_skill: "Node js",
        normalized_taxonomy_id: null,
        normalized_skill_name: "Node.js",
        proficiency_level: "advanced",
        confidence_score: 0.88,
        extraction_source: "cv_parser",
        document_reference: "portfolio.pdf",
        ai_model_used: "model-a",
        extraction_timestamp: "2026-07-19T00:01:00Z",
        metadata: {},
        created_at: "2026-07-19T00:01:00Z",
      },
    ],
    experiences: [],
    educations: [],
    certifications: [],
    languages: [],
  });

  const skillsField = result.fields.find((field) => field.fieldPath === "skills");
  assert.ok(skillsField);
  assert.equal(skillsField.fieldStatus, "verified");
  assert.equal(skillsField.sourceCount, 1);
  assert.equal(result.conflicts.length, 0);
});

test("canonicalization creates conflict objects and staff review items", () => {
  const result = consolidateCandidateProfile({
    profileDraft: { headline: "Engineer", summary: "Summary" },
    skills: [],
    experiences: [
      {
        id: "exp_1",
        profile_id: "profile_1",
        candidate_id: "candidate_1",
        role_title: "Software Engineer",
        organization_name: "ACME",
        start_date: "2020-01-01",
        end_date: "2022-01-01",
        is_current: false,
        description: "desc",
        confidence_score: 0.82,
        extraction_source: "ocr",
        document_reference: "cv_a.pdf",
        ai_model_used: "model-a",
        extraction_timestamp: "2026-07-19T00:00:00Z",
        metadata: {},
        created_at: "2026-07-19T00:00:00Z",
      },
      {
        id: "exp_2",
        profile_id: "profile_1",
        candidate_id: "candidate_1",
        role_title: "Software Engineer",
        organization_name: "ACME",
        start_date: "2021-01-01",
        end_date: "2022-01-01",
        is_current: false,
        description: "desc",
        confidence_score: 0.83,
        extraction_source: "ocr",
        document_reference: "cv_b.pdf",
        ai_model_used: "model-a",
        extraction_timestamp: "2026-07-19T00:01:00Z",
        metadata: {},
        created_at: "2026-07-19T00:01:00Z",
      },
    ],
    educations: [],
    certifications: [],
    languages: [],
  });

  assert.ok(result.conflicts.some((conflict) => conflict.fieldPath.includes("experiences") && conflict.status === "needs_staff_review"));
  assert.ok(result.reviewItems.some((item) => item.itemType === "conflict"));
});
