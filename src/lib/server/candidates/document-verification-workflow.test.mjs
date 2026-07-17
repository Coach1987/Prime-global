import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(process.cwd(), "src/lib/server/candidates/document-verification-workflow.ts");

function source() {
  return readFileSync(sourcePath, "utf8");
}

test("workflow source includes supported document type mapping", () => {
  const content = source();
  assert.match(content, /explicitType\?: string \| null/);
  assert.match(content, /cv/);
  assert.match(content, /diploma/);
  assert.match(content, /certificate/);
  assert.match(content, /supporting_document/);
  assert.match(content, /additional_evidence/);
});

test("workflow source defines manual-review escalation thresholds", () => {
  const content = source();
  assert.match(content, /highFraudOverrideApplied/);
  assert.match(content, /fraudRiskScore >= 75/);
  assert.match(content, /pending_manual_review/);
});

test("workflow source includes safe primary resume update helper", () => {
  const content = source();
  assert.match(content, /export async function safeSetPrimaryResume/);
  assert.match(content, /set_candidate_primary_resume/);
});

test("workflow source includes verification case action appends", () => {
  const content = source();
  assert.match(content, /candidate_document_verification_case_actions/);
  assert.match(content, /appendVerificationCaseAction/);
});
