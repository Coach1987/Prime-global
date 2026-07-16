import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  appendPhase10EvidenceCorrection,
  createPhase10EvidenceEvent,
  recordPhase10EvidenceAccess,
  requestPhase10ExportAuthorization,
  activatePhase10LegalHold,
  verifyPhase10EvidenceChain,
} from "./service.ts";
import { createPhase10OrganizationContext } from "../organization/index.ts";
import { createPhase10PolicyContext } from "../policy-engine/index.ts";
import { evaluatePhase10EvidencePolicy } from "./policies.ts";
import { createPhase10Logger } from "../observability/index.ts";

const repoRoot = "/workspaces/Prime-global";

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function createInMemoryEvidenceRepository() {
  const events = [];
  const audits = [];

  return {
    __events: events,
    __audits: audits,

    async insertEvidenceEvent(input) {
      const row = {
        id: randomUUID(),
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      events.push(row);
      return row;
    },

    async findEvidenceEventById(id) {
      return events.find((entry) => entry.id === id) ?? null;
    },

    async findEvidenceEventsByCaseId(evidenceCaseId) {
      return events
        .filter((entry) => entry.evidence_case_id === evidenceCaseId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },

    async findLatestEvidenceEventByCaseId(evidenceCaseId) {
      const list = events
        .filter((entry) => entry.evidence_case_id === evidenceCaseId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return list[0] ?? null;
    },

    async insertEvidenceAccessAudit(input) {
      const row = {
        id: randomUUID(),
        ...input,
        created_at: new Date().toISOString(),
      };
      audits.push(row);
      return row;
    },
  };
}

function createActor(role = "prime_global_admin", organization = createPhase10OrganizationContext()) {
  return {
    actorId: randomUUID(),
    actorRole: role,
    organization,
    requestId: `req_${randomUUID()}`,
    ipAddress: "127.0.0.1",
    userAgent: "phase10-test",
  };
}

test("evidence correction appends immutable chained event", async () => {
  const repository = createInMemoryEvidenceRepository();
  const actor = createActor();

  const base = await createPhase10EvidenceEvent(
    { repository },
    {
      actor,
      eventType: "captured",
      subjectType: "recruitment_message",
      subjectId: "msg-1",
      detectionSource: "ai_supervisor",
      contentHash: "content-hash-1",
      privacyClassification: "restricted",
      jurisdictionTag: "tn",
    }
  );

  const correction = await appendPhase10EvidenceCorrection(
    { repository },
    {
      actor,
      sourceEvidenceEventId: base.id,
      contentHash: "content-hash-2",
      redactedExcerpt: "updated redacted excerpt",
      normalizedSummary: "correction summary",
      metadata: { reason: "manual_review" },
    }
  );

  assert.equal(correction.correction_of_event_id, base.id);
  assert.equal(correction.evidence_case_id, base.evidence_case_id);
  assert.equal(correction.previous_event_hash, base.evidence_hash);

  const verification = await verifyPhase10EvidenceChain({ repository }, base.evidence_case_id);
  assert.equal(verification.isValid, true);
  assert.equal(verification.verifiedEventCount, 2);
  assert.equal(verification.mismatchCount, 0);
});

test("evidence chain verification catches tampered hash", async () => {
  const repository = createInMemoryEvidenceRepository();
  const actor = createActor();

  const first = await createPhase10EvidenceEvent(
    { repository },
    {
      actor,
      eventType: "captured",
      subjectType: "recruitment_message",
      subjectId: "msg-2",
      detectionSource: "staff_review",
      contentHash: "tamper-base",
      privacyClassification: "restricted",
      jurisdictionTag: "tn",
    }
  );

  await createPhase10EvidenceEvent(
    { repository },
    {
      actor,
      eventType: "captured",
      subjectType: "recruitment_message",
      subjectId: "msg-3",
      detectionSource: "staff_review",
      contentHash: "tamper-next",
      privacyClassification: "restricted",
      jurisdictionTag: "tn",
      evidenceCaseId: first.evidence_case_id,
    }
  );

  repository.__events[1].evidence_hash = "forged";

  const verification = await verifyPhase10EvidenceChain({ repository }, first.evidence_case_id);
  assert.equal(verification.isValid, false);
  assert.ok(verification.mismatchCount >= 1);
});

test("policy blocks candidate and employer access to Stage 2 evidence routes", () => {
  const candidateDecision = evaluatePhase10EvidencePolicy(
    "evidence_lookup",
    createPhase10PolicyContext({ actorRole: "candidate", action: "evidence_lookup" }),
    "phase10 evidence lookup requires authorized Prime Global staff"
  );

  const employerDecision = evaluatePhase10EvidencePolicy(
    "evidence_lookup",
    createPhase10PolicyContext({ actorRole: "employer", action: "evidence_lookup" }),
    "phase10 evidence lookup requires authorized Prime Global staff"
  );

  assert.equal(candidateDecision.allowed, false);
  assert.equal(employerDecision.allowed, false);
});

test("policy blocks cross-organization access even for staff role", () => {
  const context = createPhase10PolicyContext({
    actorRole: "prime_global_admin",
    action: "evidence_lookup",
    organization: createPhase10OrganizationContext({ organizationId: "other-org" }),
  });

  const decision = evaluatePhase10EvidencePolicy(
    "evidence_lookup",
    context,
    "phase10 evidence lookup requires authorized Prime Global staff"
  );

  assert.equal(decision.allowed, false);
  assert.match(decision.explanation, /No enabled policy matched/i);
});

test("staff evidence access is audited against the resolved evidence case", async () => {
  const repository = createInMemoryEvidenceRepository();
  const actor = createActor("prime_global_recruiter");

  const event = await createPhase10EvidenceEvent(
    { repository },
    {
      actor,
      eventType: "captured",
      subjectType: "recruitment_message",
      subjectId: "msg-4",
      detectionSource: "automated_detection",
      contentHash: "audit-base",
      privacyClassification: "confidential",
      jurisdictionTag: "tn",
    }
  );

  const audit = await recordPhase10EvidenceAccess(
    { repository },
    {
      actor,
      evidenceEventId: event.id,
      accessAction: "lookup",
      reason: "staff review",
      policyName: "phase10 evidence lookup requires authorized Prime Global staff",
      policyVersion: "1.0.0",
    }
  );

  assert.equal(audit.access_decision, "allowed");
  assert.equal(audit.evidence_case_id, event.evidence_case_id);
  assert.equal(repository.__audits.length, 1);
});

test("export requests and legal hold actions append governance events", async () => {
  const repository = createInMemoryEvidenceRepository();
  const actor = createActor();

  const base = await createPhase10EvidenceEvent(
    { repository },
    {
      actor,
      eventType: "captured",
      subjectType: "recruitment_message",
      subjectId: "msg-5",
      detectionSource: "automated_detection",
      contentHash: "export-base",
      privacyClassification: "restricted",
      jurisdictionTag: "tn",
    }
  );

  const exportEvent = await requestPhase10ExportAuthorization(
    { repository },
    {
      actor,
      evidenceCaseId: base.evidence_case_id,
      reason: "legal disclosure review",
    }
  );

  const legalHoldEvent = await activatePhase10LegalHold(
    { repository },
    {
      actor,
      evidenceCaseId: base.evidence_case_id,
      reason: "investigation",
      legalHoldState: "active",
    }
  );

  assert.equal(exportEvent.event_type, "export_requested");
  assert.equal(exportEvent.export_authorization_state, "requested");
  assert.equal(legalHoldEvent.event_type, "legal_hold_activated");
  assert.equal(legalHoldEvent.legal_hold_state, "active");
});

test("phase10 logger redacts sensitive evidence metadata", () => {
  const emitted = [];
  const logger = createPhase10Logger((entry) => emitted.push(entry));

  logger.audit({
    requestId: "req-1",
    eventId: "evt-1",
    result: "success",
    decisionOrigin: "staff_decision",
    metadata: {
      privateCv: "candidate full text",
      token: "secret-token",
      nested: { paymentCredentials: "4111" },
    },
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].metadata.privateCv, "[redacted]");
  assert.equal(emitted[0].metadata.token, "[redacted]");
  assert.equal(emitted[0].metadata.nested.paymentCredentials, "[redacted]");
});

test("evidence migration enforces append-only controls and restrictive RLS", () => {
  const migration = readRepoFile("supabase/migrations/202607150004_phase10_shield_evidence_governance.sql");

  assert.match(migration, /create table if not exists public\.shield_evidence_events/i);
  assert.match(migration, /create table if not exists public\.shield_evidence_access_audit/i);
  assert.match(migration, /shield_evidence_append_only_guard/i);
  assert.match(migration, /before update on public\.shield_evidence_events/i);
  assert.match(migration, /before delete on public\.shield_evidence_events/i);
  assert.match(migration, /alter table public\.shield_evidence_events enable row level security/i);
  assert.match(migration, /create policy "shield_evidence_events_staff_read"/i);
  assert.match(migration, /create policy "shield_evidence_events_service_insert"/i);

  const migrationLower = migration.toLowerCase();
  assert.equal(migrationLower.includes("shield_evidence_events\nfor select\nto public"), false);
  assert.equal(migrationLower.includes("shield_evidence_access_audit\nfor select\nto public"), false);
});
