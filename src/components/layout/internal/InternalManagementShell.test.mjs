import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("internal owner shell does not hardcode locale-prefixed admin links", () => {
  const filePath = path.join(process.cwd(), "src/components/layout/internal/InternalManagementShell.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.equal(source.includes("/${locale}/admin/account"), false);
});
