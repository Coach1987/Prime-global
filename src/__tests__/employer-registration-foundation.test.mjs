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

test("public employer entries sit outside protected route groups", () => {
  const publicLanding = readSource("src/app/[locale]/employers/page.tsx");
  const publicLogin = readSource("src/app/[locale]/employers/login/page.tsx");
  const publicRegister = readSource("src/app/[locale]/employers/register/page.tsx");
  const approvedLayout = readSource("src/app/[locale]/employers/(approved)/layout.tsx");
  const onboardingLayout = readSource("src/app/[locale]/employers/(onboarding)/layout.tsx");

  assert.match(publicLanding, /employerLanding/);
  assert.match(publicLogin, /mode=signin&role=employer/);
  assert.match(publicRegister, /mode=signup&role=employer/);
  assert.match(approvedLayout, /allowedAccountStatuses: \["approved"\]/);
  assert.match(onboardingLayout, /"pending_review", "approved", "rejected"/);
});

test("registration creates only server-issued session cookies after required legal persistence", () => {
  const registrationRoute = readSource("src/app/api/employers/auth/register/route.ts");
  const registrationClient = readSource("src/components/auth/UnifiedAuthExperience.tsx");

  assert.match(registrationRoute, /persistLegalAcceptances\(/);
  assert.match(registrationRoute, /signInWithPassword\(/);
  assert.match(registrationRoute, /setAuthCookies\(/);
  assert.match(registrationRoute, /rollbackEmployerRegistration/);
  assert.doesNotMatch(registrationClient, /SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient|pg_access_token|pg_refresh_token/);
});

test("employer registration fields expose stable accessible error relationships", () => {
  const authExperience = readSource("src/components/auth/UnifiedAuthExperience.tsx");

  assert.match(authExperience, /id=\{inputId\}/);
  assert.match(authExperience, /name=\{key\}/);
  assert.match(authExperience, /htmlFor=\{inputId\}/);
  assert.match(authExperience, /aria-invalid=\{hasError\}/);
  assert.match(authExperience, /aria-describedby=\{hasError \? errorId : undefined\}/);
  assert.match(authExperience, /id=\{errorId\}/);
  assert.doesNotMatch(authExperience, /data-tour/);
});

test("pending approval and employer landing messages are complete in both locales", () => {
  const en = JSON.parse(readSource("messages/en.json"));
  const ar = JSON.parse(readSource("messages/ar.json"));

  for (const messages of [en, ar]) {
    assert.ok(messages.employerLanding.title);
    assert.ok(messages.employerPendingApproval.title);
    assert.ok(messages.employerPendingApproval.nextBody);
    assert.ok(messages.employerPendingApproval.reviewBody);
    assert.ok(messages.employerCompanyProfile.registrationDataNotice);
  }
});