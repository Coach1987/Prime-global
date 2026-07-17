import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202607170003_primary_resume_transaction_fn.sql"
);

function sql() {
  return readFileSync(migrationPath, "utf8");
}

test("primary resume migration defines transactional setter function", () => {
  const content = sql();
  assert.match(content, /create or replace function public\.set_candidate_primary_resume/i);
  assert.match(content, /update public\.candidate_resumes\s+set is_primary = false/i);
  assert.match(content, /update public\.candidate_resumes\s+set is_primary = true/i);
  assert.match(content, /raise exception 'resume_not_found'/i);
});
