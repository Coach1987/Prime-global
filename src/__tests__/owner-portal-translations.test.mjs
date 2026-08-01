import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

function readJson(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

test("owner portal company management translations include document and count labels", () => {
  const en = readJson("messages/en.json");
  const ar = readJson("messages/ar.json");

  assert.equal(en.ownerPortal.companyManagement.previewDocument, "Preview document");
  assert.equal(en.ownerPortal.companyManagement.fields.advertisementsCount, "Advertisements");
  assert.equal(ar.ownerPortal.companyManagement.previewDocument, "معاينة المستند");
  assert.equal(ar.ownerPortal.companyManagement.fields.advertisementsCount, "الإعلانات");
});
