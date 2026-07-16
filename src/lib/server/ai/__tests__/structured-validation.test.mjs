import test from "node:test";
import assert from "node:assert/strict";

import { validateStructuredOutput } from "../schemas/validation.ts";

const validRecommendations = {
  schemaVersion: "v1",
  recommendations: [
    {
      recommendationId: "r1",
      title: "Add cloud certification",
      rationale: "Improves shortlist coverage",
      confidence: 0.92,
      provenance: { source: "cv", reference: "section:certifications" },
    },
  ],
  fieldConfidence: [{ fieldPath: "recommendations[0].title", confidence: 0.92, source: "ai" }],
  provenanceRefs: [{ source: "cv", reference: "file:resume" }],
};

test("valid structured JSON passes", () => {
  const result = validateStructuredOutput("recommendations", validRecommendations);
  assert.equal(result.ok, true);
});

test("malformed JSON receives deterministic repair", () => {
  const malformed = "```json\n{'schemaVersion':'v1','recommendations':[{'recommendationId':'r1','title':'A','rationale':'B','confidence':0.9,}], 'fieldConfidence':[{'fieldPath':'a','confidence':0.9,'source':'ai'}], 'provenanceRefs':[{'source':'cv','reference':'x'}]}\n```";
  const result = validateStructuredOutput("recommendations", malformed);

  assert.equal(result.ok, true);
  assert.ok(result.repairsUsed <= 2);
});

test("schema validation failure is normalized", () => {
  const invalid = { schemaVersion: "v1", recommendations: [{ recommendationId: "r1" }] };
  const result = validateStructuredOutput("recommendations", invalid);

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "AI_SCHEMA_VALIDATION_FAILED");
});

test("unexpected fields are rejected by strict schemas", () => {
  const invalid = {
    ...validRecommendations,
    unexpected: "not-allowed",
  };

  const result = validateStructuredOutput("recommendations", invalid);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "AI_SCHEMA_VALIDATION_FAILED");
});

test("confidence and provenance metadata are preserved", () => {
  const result = validateStructuredOutput("recommendations", validRecommendations);
  assert.equal(result.ok, true);
  assert.equal(result.data.recommendations[0].confidence, 0.92);
  assert.equal(result.data.recommendations[0].provenance.source, "cv");
  assert.equal(result.data.fieldConfidence[0].fieldPath, "recommendations[0].title");
  assert.equal(result.data.provenanceRefs[0].reference, "file:resume");
});