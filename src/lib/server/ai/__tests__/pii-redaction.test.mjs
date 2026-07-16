import test from "node:test";
import assert from "node:assert/strict";

import { redactSensitiveText } from "../safety/pii-redaction.ts";

test("english email redaction uses stable placeholder", () => {
  const input = "Reach me at jane.doe@example.com for details.";
  const output = redactSensitiveText(input, "low");
  assert.ok(output.redactedText.includes("[REDACTED_EMAIL]"));
  assert.ok(!output.redactedText.includes("jane.doe@example.com"));
});

test("arabic and english phone redaction", () => {
  const input = "Call +1 (555) 123-4567 او اتصل على ٠١٢٣٤٥٦٧٨٩";
  const output = redactSensitiveText(input, "low");
  assert.ok(output.redactedText.includes("[REDACTED_PHONE]"));
  assert.ok(!output.redactedText.includes("123-4567"));
  assert.ok(!output.redactedText.includes("٠١٢٣٤٥٦٧٨٩"));
});

test("physical address redaction for english and arabic", () => {
  const input = "Address: 22 Baker Street, London. العنوان شارع التحرير عمارة 12";
  const output = redactSensitiveText(input, "high");
  assert.ok(output.redactedText.includes("[REDACTED_ADDRESS]"));
});

test("national ID and passport redaction", () => {
  const input = "National ID: A123456789 and Passport Number: P99887766";
  const output = redactSensitiveText(input, "high");
  assert.ok(output.redactedText.includes("[REDACTED_ID]"));
  assert.ok(!output.redactedText.includes("A123456789"));
  assert.ok(!output.redactedText.includes("P99887766"));
});

test("document path redaction", () => {
  const input = "candidate-private/abc/cv/2026/07/file.pdf should remain private";
  const output = redactSensitiveText(input, "medium");
  assert.ok(output.redactedText.includes("[REDACTED_DOCUMENT_PATH]"));
  assert.ok(!output.redactedText.includes("candidate-private/abc"));
});

test("redaction does not mutate original input", () => {
  const input = "Email me at qa@example.com";
  const snapshot = `${input}`;
  const output = redactSensitiveText(input, "low");
  assert.equal(input, snapshot);
  assert.notEqual(output.redactedText, input);
});