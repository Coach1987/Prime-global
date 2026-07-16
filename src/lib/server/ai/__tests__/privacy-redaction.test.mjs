import test from "node:test";
import assert from "node:assert/strict";

import { redactForLogs } from "../config/env.ts";

test("redaction strips secret markers and direct contact info", () => {
  const input = "api_key=sk-test hello jane@example.com +216-99-999-999 https://private.local/path";
  const output = redactForLogs(input);

  assert.ok(!output.includes("jane@example.com"));
  assert.ok(!output.includes("+216-99-999-999"));
  assert.ok(!output.includes("https://private.local/path"));
  assert.ok(!output.includes("api_key"));

  assert.ok(output.includes("[redacted-email]"));
  assert.ok(output.includes("[redacted-phone]"));
  assert.ok(output.includes("[redacted-url]"));
  assert.ok(output.includes("[redacted-secret]"));
});