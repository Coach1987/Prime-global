import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

function readSource(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("candidate pages use localized upload controls and status masking", () => {
  const settingsSource = readSource("src/app/[locale]/candidate/settings/page.tsx");
  const onboardingSource = readSource("src/app/[locale]/candidate/onboarding/page.tsx");
  const applicationsSource = readSource("src/app/[locale]/candidate/applications/page.tsx");
  const applicationDetailsSource = readSource("src/app/[locale]/candidate/applications/[applicationId]/page.tsx");
  const documentsSource = readSource("src/app/[locale]/candidate/documents/page.tsx");

  assert.match(settingsSource, /LocalizedFileInput/);
  assert.match(onboardingSource, /LocalizedFileInput/);

  assert.match(applicationsSource, /localizeCandidateStatus\(/);
  assert.match(applicationDetailsSource, /localizeCandidateStatus\(/);
  assert.match(documentsSource, /localizeCandidateStatus\(/);
});

test("notifications page has Arabic and English heading copy", () => {
  const notificationsSource = readSource("src/app/[locale]/notifications/page.tsx");

  assert.match(notificationsSource, /Notification Center/);
  assert.match(notificationsSource, /مركز الإشعارات/);
});

test("candidate status localization maps pending_ai_analysis", () => {
  const localizationSource = readSource("src/lib/candidates/localization.ts");

  assert.match(localizationSource, /pending_ai_analysis/);
  assert.match(localizationSource, /Pending AI Analysis/);
  assert.match(localizationSource, /قيد تحليل الذكاء الاصطناعي/);
});
