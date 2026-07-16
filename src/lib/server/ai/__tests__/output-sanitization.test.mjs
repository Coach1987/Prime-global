import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeEmployerOutput, sanitizeGenericOutput } from "../safety/output-sanitizer.ts";

test("employer contact sanitization removes direct vectors", () => {
  const input =
    "Email hr@company.com or call +216 55 123 456, WhatsApp me on wa.me/123, linkedin.com/in/user";
  const output = sanitizeEmployerOutput(input);

  assert.equal(output.redactionApplied, true);
  assert.ok(!output.sanitized.includes("hr@company.com"));
  assert.ok(!output.sanitized.includes("+216 55 123 456"));
  assert.ok(!output.sanitized.includes("wa.me/123"));
  assert.ok(!output.sanitized.includes("linkedin.com/in/user"));
  assert.ok(output.warnings.some((warning) => warning.includes("strict sanitizer")));
});

test("hidden contact details in free text are removed", () => {
  const input = "You can contact me at john dot doe at example dot com for faster response";
  const output = sanitizeEmployerOutput(input);

  assert.ok(!/john\s+dot\s+doe\s+at\s+example\s+dot\s+com/i.test(output.sanitized));
  assert.ok(output.sanitized.includes("[REDACTED_EMAIL]"));
});

test("generic sanitizer keeps non-sensitive context", () => {
  const input = "Candidate has 8 years experience in frontend leadership.";
  const output = sanitizeGenericOutput(input);

  assert.equal(output.sanitized, input);
  assert.equal(output.redactionApplied, false);
});