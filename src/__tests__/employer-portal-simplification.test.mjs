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

test("employer account menu has simplified seven-item structure", () => {
  const authActions = readSource("src/components/layout/Header/AuthActions.tsx");
  const employerLinksSection = authActions.match(/const employerLinks = \[(.*?)\];/s)?.[1] ?? "";

  assert.match(authActions, /getDashboardHref\("employer"\)/);
  assert.match(authActions, /getAccountHref\("employer"\)/);
  assert.match(employerLinksSection, /href: "\/employers\/jobs"/);
  assert.match(employerLinksSection, /href: "\/employers\/candidate-profiles"/);
  assert.match(employerLinksSection, /href: "\/employers\/advertisements"/);
  assert.match(employerLinksSection, /href: "\/employers\/settings"/);

  assert.doesNotMatch(employerLinksSection, /href: "\/employers\/verification"/);
  assert.doesNotMatch(employerLinksSection, /href: "\/employers\/workflow"/);
  assert.doesNotMatch(employerLinksSection, /href: "\/employers\/interview-center"/);
  assert.doesNotMatch(employerLinksSection, /href: "\/employers\/supervised-conversations"/);
  assert.doesNotMatch(employerLinksSection, /href: "\/notifications"/);
});

test("dashboard does not include inline job creation form or raw load-failure text", () => {
  const dashboard = readSource("src/app/[locale]/employers/dashboard/page.tsx");

  assert.doesNotMatch(dashboard, /Failed to load dashboard data/);
  assert.doesNotMatch(dashboard, /createDraftJob/);
  assert.doesNotMatch(dashboard, /supabase/i);
  assert.match(dashboard, /Complete your company profile to begin\./);
  assert.match(dashboard, /أكمل ملف الشركة للبدء\./);
});

test("company verification route safely redirects to unified company profile", () => {
  const verificationPage = readSource("src/app/[locale]/employers/verification/page.tsx");

  assert.match(verificationPage, /redirect\(`\/\$\{locale\}\/employers\/company-profile`\)/);
});

test("settings page is dedicated to account and company preferences", () => {
  const settingsPage = readSource("src/app/[locale]/employers/settings/page.tsx");

  assert.match(settingsPage, /Account Preferences|تفضيلات الحساب/);
  assert.doesNotMatch(settingsPage, /Interview Center|المقابلات/);
});
