import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCandidateAuthHref,
  resolveCandidatePostAuthHref,
  sanitizeLocalizedJobReturnTo,
} from "./return-to.ts";

test("sanitizeLocalizedJobReturnTo accepts localized job routes with apply intent", () => {
  const value = sanitizeLocalizedJobReturnTo("/en/jobs/senior-trainer?applyIntent=1", "en");
  assert.equal(value, "/en/jobs/senior-trainer?applyIntent=1");
});

test("sanitizeLocalizedJobReturnTo rejects external and non-job paths", () => {
  assert.equal(sanitizeLocalizedJobReturnTo("https://evil.test/attack", "en"), null);
  assert.equal(sanitizeLocalizedJobReturnTo("/en/candidate/dashboard", "en"), null);
  assert.equal(sanitizeLocalizedJobReturnTo("//evil.test", "en"), null);
});

test("buildCandidateAuthHref preserves safe returnTo", () => {
  const href = buildCandidateAuthHref({
    locale: "en",
    mode: "register",
    returnTo: "/en/jobs/role-123?applyIntent=1",
  });

  assert.equal(
    href,
    "/en/auth?mode=register&audience=candidate&returnTo=%2Fen%2Fjobs%2Frole-123%3FapplyIntent%3D1"
  );
});

test("buildCandidateAuthHref preserves returnTo for sign-in", () => {
  const href = buildCandidateAuthHref({
    locale: "en",
    mode: "signin",
    returnTo: "/en/jobs/role-123?applyIntent=1",
  });

  assert.equal(
    href,
    "/en/auth?mode=signin&audience=candidate&returnTo=%2Fen%2Fjobs%2Frole-123%3FapplyIntent%3D1"
  );
});

test("resolveCandidatePostAuthHref returns selected job when safe", () => {
  const href = resolveCandidatePostAuthHref({
    locale: "en",
    returnTo: "/en/jobs/role-123?applyIntent=1",
    fallback: "/en/candidate/onboarding",
  });

  assert.equal(href, "/en/jobs/role-123?applyIntent=1");
});

test("resolveCandidatePostAuthHref rejects unsafe returnTo and keeps fallback", () => {
  const href = resolveCandidatePostAuthHref({
    locale: "ar",
    returnTo: "https://evil.test",
    fallback: "/ar/candidate/onboarding",
  });

  assert.equal(href, "/ar/candidate/onboarding");
});

test("sanitizeLocalizedJobReturnTo supports Arabic locale", () => {
  const value = sanitizeLocalizedJobReturnTo("/ar/jobs/operations-lead?applyIntent=1", "ar");
  assert.equal(value, "/ar/jobs/operations-lead?applyIntent=1");
});
