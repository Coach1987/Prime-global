import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(process.cwd(), "src/lib/server/candidates/document-identity-verification.ts");

function source() {
  return readFileSync(sourcePath, "utf8");
}

test("identity verification source includes provider selection with deterministic fallback", () => {
  const content = source();
  assert.match(content, /selectDocumentVerificationProvider/);
  assert.match(content, /deterministic-fallback/);
  assert.match(content, /DOCUMENT_VERIFICATION_PROVIDER/);
});

test("identity verification source includes fraud risk and external verification references", () => {
  const content = source();
  assert.match(content, /fraudRiskScore/);
  assert.match(content, /fraudRiskBand/);
  assert.match(content, /extractedVerificationReferences/);
  assert.match(content, /detectDuplicateHashAcrossAccounts/);
});

test("identity verification source includes persistent fraud and provider fields", () => {
  const content = source();
  assert.match(content, /verification_provider/);
  assert.match(content, /fraud_risk_score/);
  assert.match(content, /external_verification_status/);
});
