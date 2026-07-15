import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createInMemoryEvidenceStorageProvider,
  createSha256HashProvider,
  createSystemClockProvider,
  createUuidIdProvider,
  replayEvidenceCase,
  createEvidenceIntegrityMonitor,
  normalizeBackwardCompatibility,
  normalizeForwardCompatibility,
  toVersionedEvidenceEnvelope,
  createTamperDetectionResult,
} from "./infrastructure/index.ts";
import { createPhase10EvidenceEvent } from "./service.ts";
import { createPhase10OrganizationContext } from "../organization/index.ts";

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

function createActor(role = "prime_global_admin") {
  return {
    actorId: randomUUID(),
    actorRole: role,
    organization: createPhase10OrganizationContext(),
    requestId: `req_${randomUUID()}`,
  };
}

async function withEnvFlag(name, value, fn) {
  const previous = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}

test("integrity monitor is feature-flagged and skipped by default", async () => {
  const repository = createInMemoryEvidenceRepository();
  const monitor = createEvidenceIntegrityMonitor({
    repository,
    hasher: createSha256HashProvider(),
    clock: createSystemClockProvider(),
    idProvider: createUuidIdProvider(),
    storage: createInMemoryEvidenceStorageProvider(),
  });

  const result = await monitor.runCaseCheck(randomUUID());
  assert.equal(result.enabled, false);
  assert.equal(result.status, "skipped");
});

test("integrity monitor runs when infra flags are enabled", async () => {
  await withEnvFlag("SHIELD_INFRA_FOUNDATION_ENABLED", "true", async () => {
    await withEnvFlag("SHIELD_INTEGRITY_MONITOR_ENABLED", "true", async () => {
      const repository = createInMemoryEvidenceRepository();
      const actor = createActor();

      const first = await createPhase10EvidenceEvent(
        { repository },
        {
          actor,
          eventType: "captured",
          subjectType: "recruitment_message",
          subjectId: "msg-1",
          detectionSource: "staff_review",
          contentHash: "integrity-a",
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
          subjectId: "msg-2",
          detectionSource: "staff_review",
          contentHash: "integrity-b",
          privacyClassification: "restricted",
          jurisdictionTag: "tn",
          evidenceCaseId: first.evidence_case_id,
        }
      );

      const monitor = createEvidenceIntegrityMonitor({
        repository,
        hasher: createSha256HashProvider(),
        clock: createSystemClockProvider(),
        idProvider: createUuidIdProvider(),
        storage: createInMemoryEvidenceStorageProvider(),
      });

      const result = await monitor.runCaseCheck(first.evidence_case_id);
      assert.equal(result.enabled, true);
      assert.equal(result.status, "ok");
      assert.equal(result.signalCount, 0);
    });
  });
});

test("event replay remains disabled by default", async () => {
  const repository = createInMemoryEvidenceRepository();
  const result = await replayEvidenceCase(
    { repository, clock: createSystemClockProvider() },
    {
      evidenceCaseId: randomUUID(),
    }
  );

  assert.equal(result.enabled, false);
  assert.equal(result.status, "skipped");
});

test("event replay foundation replays events when flags are enabled", async () => {
  await withEnvFlag("SHIELD_INFRA_FOUNDATION_ENABLED", "true", async () => {
    await withEnvFlag("SHIELD_EVENT_REPLAY_ENABLED", "true", async () => {
      const repository = createInMemoryEvidenceRepository();
      const actor = createActor();

      const first = await createPhase10EvidenceEvent(
        { repository },
        {
          actor,
          eventType: "captured",
          subjectType: "recruitment_message",
          subjectId: "msg-3",
          detectionSource: "staff_review",
          contentHash: "replay-a",
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
          subjectId: "msg-4",
          detectionSource: "staff_review",
          contentHash: "replay-b",
          privacyClassification: "restricted",
          jurisdictionTag: "tn",
          evidenceCaseId: first.evidence_case_id,
        }
      );

      const replay = await replayEvidenceCase(
        { repository, clock: createSystemClockProvider() },
        {
          evidenceCaseId: first.evidence_case_id,
        }
      );

      assert.equal(replay.enabled, true);
      assert.equal(replay.status, "completed");
      assert.equal(replay.processedCount, 2);
      assert.equal(replay.nextCursor?.eventId !== null, true);
    });
  });
});

test("versioning and compatibility helpers preserve unknown fields", () => {
  const envelope = toVersionedEvidenceEnvelope({
    id: randomUUID(),
    evidence_case_id: randomUUID(),
    organization_id: "prime-global",
    tenant_id: null,
    actor_auth_user_id: randomUUID(),
    actor_role: "prime_global_admin",
    event_type: "captured",
    subject_type: "recruitment_message",
    subject_id: "msg-5",
    conversation_id: null,
    interview_id: null,
    message_id: null,
    attachment_id: null,
    payment_reference: null,
    contract_reference: null,
    detection_source: "staff_review",
    content_hash: "v1",
    evidence_hash: "v1",
    previous_event_hash: null,
    secure_object_ref: null,
    redacted_excerpt: null,
    normalized_summary: null,
    privacy_classification: "restricted",
    jurisdiction_tag: "tn",
    retention_status: "active",
    legal_hold_state: "none",
    export_authorization_state: "not_requested",
    staff_decision_reference: null,
    appeal_reference: null,
    appeal_history: [],
    override_history: [],
    correction_of_event_id: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const withUnknown = {
    ...envelope,
    schemaVersion: 99,
    unknownFields: {
      futureKey: "future-value",
    },
  };

  const forward = normalizeForwardCompatibility(withUnknown);
  const backward = normalizeBackwardCompatibility(forward.transformedEnvelope, 1);

  assert.equal(forward.compatible, true);
  assert.equal(backward.compatible, true);
  assert.equal(backward.transformedEnvelope.unknownFields?.futureKey, "future-value");
});

test("tamper detection foundation reports severity", () => {
  const result = createTamperDetectionResult("case-1", [
    {
      eventId: "evt-1",
      evidenceCaseId: "case-1",
      signalType: "hash_mismatch",
      severity: "high",
      message: "hash mismatch",
    },
    {
      eventId: "evt-2",
      evidenceCaseId: "case-1",
      signalType: "broken_chain",
      severity: "critical",
      message: "broken chain",
    },
  ]);

  assert.equal(result.hasTampering, true);
  assert.equal(result.highestSeverity, "critical");
  assert.equal(result.signals.length, 2);
});
