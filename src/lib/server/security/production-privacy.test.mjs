import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sanitizeEmployerCandidateProfile } from "../candidates/employer-profile.ts";

const repoRoot = "/workspaces/Prime-global";

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("candidate private documents bucket policy enforces owner-or-staff access", () => {
  const migration = readRepoFile("supabase/migrations/202607150001_candidate_private_public_profiles.sql");

  assert.match(migration, /create policy\s+"candidate_private_documents_access"/i);
  assert.match(migration, /bucket_id\s*=\s*'candidate-private-documents'/i);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text/i);
  assert.match(migration, /prime_global_recruiter/i);
  assert.match(migration, /prime_global_admin/i);
  assert.ok(!/to\s+public\b/i.test(migration), "storage policy must not grant public access");
});

test("private access audit table has RLS and restrictive admin policy", () => {
  const migration = readRepoFile("supabase/migrations/202607150003_candidate_privacy_ai_supervisor_job_alerts.sql");

  assert.match(migration, /alter table\s+public\.candidate_private_access_audit\s+enable row level security/i);
  assert.match(migration, /create policy\s+"candidate_private_access_audit_admin_only"/i);
  assert.match(migration, /on\s+public\.candidate_private_access_audit\s+for all\s+to\s+authenticated/i);
  assert.match(migration, /prime_global_recruiter/i);
  assert.match(migration, /prime_global_admin/i);

  const auditPolicySection = migration.split("create policy \"candidate_private_access_audit_admin_only\"")[1] ?? "";
  assert.ok(!/\bto\s+public\b/i.test(auditPolicySection), "audit policy must never be public");
});

test("employer original CV endpoint remains explicit deny-only", () => {
  const routeCode = readRepoFile("src/app/api/employers/applicants/[applicationId]/cv/route.ts");

  assert.match(routeCode, /status:\s*403/);
  assert.match(routeCode, /Employer access to original CVs is not permitted/i);
  assert.ok(!routeCode.includes("createSignedUrl"), "route must never create downloadable CV URLs for employers");
});

test("employer profile sanitizer removes direct contact vectors", () => {
  const sanitized = sanitizeEmployerCandidateProfile({
    candidate_reference: "PG-12345",
    professional_summary: "Contact me at person@example.com or +216-99-999-999",
    ai_summary: "Portfolio: https://example.com/profile",
    skills: ["JavaScript", "john.doe@example.com"],
    languages: ["English", "telegram @john_doe"],
  });

  assert.equal(String(sanitized.professional_summary).includes("[redacted]"), true);
  assert.equal(String(sanitized.ai_summary).includes("[redacted]"), true);
  assert.equal(Array.isArray(sanitized.skills), true);
  assert.equal(Array.isArray(sanitized.languages), true);
  assert.equal(String(sanitized.skills[1]).includes("[redacted]"), true);
  assert.equal(String(sanitized.languages[1]).includes("[redacted]"), true);
});

test("AI workflow endpoint is restricted to Prime Global staff roles", () => {
  const aiRoute = readRepoFile("src/app/api/ai/route.ts");

  assert.match(aiRoute, /PRIME_GLOBAL_ROLES\s*=\s*\["prime_global_recruiter",\s*"prime_global_admin",\s*"admin",\s*"super_admin"\]/);
  assert.ok(!/"candidate"/.test(aiRoute), "candidate role must not be authorized in /api/ai");
  assert.ok(!/"employer"/.test(aiRoute), "employer role must not be authorized in /api/ai");
});

test("candidate registration endpoint enforces fixed candidate role", () => {
  const authRoute = readRepoFile("src/app/api/auth/route.ts");

  assert.match(authRoute, /\.strict\(\)/);
  assert.match(authRoute, /app_role:\s*"candidate"/);
  assert.ok(!/payload\.role/.test(authRoute), "request payload role must never be used");
});
