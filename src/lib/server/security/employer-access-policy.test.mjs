import test from "node:test";
import assert from "node:assert/strict";
import {
  isPendingEmployerApiAllowed,
  normalizeEmployerAccountStatus,
} from "./employer-access-policy.ts";

function request(pathname, method = "GET") {
  return { method, url: `https://primeglobal.test${pathname}` };
}

test("normalizes employer verification status into authorization status", () => {
  assert.equal(normalizeEmployerAccountStatus("pending"), "pending_review");
  assert.equal(normalizeEmployerAccountStatus("documents_submitted"), "pending_review");
  assert.equal(normalizeEmployerAccountStatus("admin_review"), "pending_review");
  assert.equal(normalizeEmployerAccountStatus("verified"), "approved");
  assert.equal(normalizeEmployerAccountStatus("rejected"), "rejected");
  assert.equal(normalizeEmployerAccountStatus("suspended"), "suspended");
  assert.equal(normalizeEmployerAccountStatus("unknown"), null);
});

test("pending employers can use only onboarding-safe API methods", () => {
  assert.equal(isPendingEmployerApiAllowed(request("/api/auth/me")), true);
  assert.equal(isPendingEmployerApiAllowed(request("/api/auth/logout", "POST")), true);
  assert.equal(isPendingEmployerApiAllowed(request("/api/employers/profile", "PATCH")), true);
  assert.equal(isPendingEmployerApiAllowed(request("/api/companies/verification", "POST")), true);
  assert.equal(isPendingEmployerApiAllowed(request("/api/employers/jobs", "GET")), false);
  assert.equal(isPendingEmployerApiAllowed(request("/api/employers/jobs", "POST")), false);
  assert.equal(isPendingEmployerApiAllowed(request("/api/employers/advertisements", "POST")), false);
  assert.equal(isPendingEmployerApiAllowed(request("/api/employers/candidate-profiles", "GET")), false);
  assert.equal(isPendingEmployerApiAllowed(request("/api/auth/logout", "GET")), false);
});