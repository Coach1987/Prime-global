import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202607170002_candidate_document_versions_and_cases.sql"
);

function sql() {
  return readFileSync(migrationPath, "utf8");
}

test("migration defines immutable document version and case tables", () => {
  const content = sql();
  assert.match(content, /create table if not exists public\.candidate_document_versions/i);
  assert.match(content, /create table if not exists public\.candidate_document_verification_cases/i);
  assert.match(content, /create table if not exists public\.candidate_document_verification_case_actions/i);
});

test("migration enforces append-only guards", () => {
  const content = sql();
  assert.match(content, /append-only/i);
  assert.match(content, /candidate_document_identity_verifications_append_only_update/i);
  assert.match(content, /candidate_document_case_actions_append_only_update/i);
});

test("migration applies strict RLS policies for versions and cases", () => {
  const content = sql();
  assert.match(content, /alter table public\.candidate_document_versions enable row level security/i);
  assert.match(content, /candidate_document_versions_owner_staff_select/i);
  assert.match(content, /candidate_document_verification_cases_owner_staff_select/i);
  assert.match(content, /candidate_document_verification_case_actions_owner_staff_select/i);
});

test("migration defines verification status workflow states", () => {
  const content = sql();
  const expectedStates = [
    "pending_ai_analysis",
    "auto_approved",
    "pending_manual_review",
    "additional_evidence_requested",
    "replacement_requested",
    "live_verification_required",
    "escalated",
    "verified",
    "rejected",
    "superseded",
  ];

  for (const state of expectedStates) {
    assert.match(content, new RegExp(state));
  }
});
