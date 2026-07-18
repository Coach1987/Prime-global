import test from "node:test";
import assert from "node:assert/strict";
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
