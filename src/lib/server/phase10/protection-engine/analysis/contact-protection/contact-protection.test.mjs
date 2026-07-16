import test from "node:test";
import assert from "node:assert/strict";

import {
  createContactProtectionDetectors,
  createInMemoryCrossMessageRepository,
  createInMemoryFalsePositiveRepository,
  createInMemoryMessageProjectionRepository,
  createProfileProtectionPlan,
  protectMessageContactInformation,
  recordContactProtectionFalsePositive,
} from "./index.ts";

function createDependencies(overrides = {}) {
  const events = [];
  const audit = [];
  const evidence = [];

  return {
    events,
    audit,
    evidence,
    deps: {
      detectors: createContactProtectionDetectors(),
      projectionRepository: createInMemoryMessageProjectionRepository(),
      crossMessageRepository: createInMemoryCrossMessageRepository(),
      falsePositiveRepository: createInMemoryFalsePositiveRepository(),
      resolveRule: ({ findingType, fieldCategory }) => ({
        ruleId: `rule:${findingType}:${fieldCategory}`,
        ruleVersion: "1.0.0",
        registryVersion: "stage9",
        policyIds: ["phase10.contact-protection"],
        businessRuleIds: ["protected-interview"],
        ruleSnapshotHash: "snapshot",
        resolutionTimestamp: new Date().toISOString(),
        effectiveDateUsed: new Date().toISOString(),
        fallbackApplied: false,
        deprecatedRuleWarning: false,
        humanReviewRequirement: false,
      }),
      emitEvent: async (eventType, metadata) => {
        events.push({ eventType, metadata });
      },
      appendAudit: async (event, metadata) => {
        audit.push({ event, metadata });
      },
      appendEvidence: async (metadataHash, metadata) => {
        evidence.push({ metadataHash, metadata });
      },
      ...overrides,
    },
  };
}

function createContext() {
  return {
    actor: {
      actorId: "staff-1",
      role: "prime_global_staff",
    },
    organizationId: "org-1",
    tenantId: null,
    conversationId: "conversation-1",
    workflowStage: "interview",
    priorRelatedFindings: [],
    policyVersion: "policy-v1",
    consentVersion: "consent-v1",
  };
}

test("candidate-friendly contact protection masks contact channels", async () => {
  const { deps, events, evidence } = createDependencies();
  const result = await protectMessageContactInformation(
    {
      messageId: "message-1",
      messageText: "Email me at first.last@example.com or join https://zoom.us/j/123456.",
      sourceCategory: "messages",
      context: createContext(),
    },
    deps,
    {
      featureFlags: {
        CONTACT_PROTECTION_ENABLED: true,
      },
    }
  );

  assert.ok(result.findings.some((finding) => finding.findingType === "email"));
  assert.ok(result.findings.some((finding) => finding.findingType === "external_meeting_link"));
  assert.match(result.protectedMessageText, /\[protected-email\]/);
  assert.match(result.protectedMessageText, /\[protected-meeting-link\]/);
  assert.ok(result.candidateFriendlyExplanation.includes("Prime Global"));
  assert.equal(result.policyEvaluated, true);
  assert.equal(result.projection === null, false);
  assert.ok(events.some((entry) => entry.eventType === "ContactProtectionAnalysisStarted"));
  assert.ok(events.some((entry) => entry.eventType === "MeetingLinkProtected"));
  assert.ok(evidence.length > 0);
});

test("feature flag off keeps message unchanged", async () => {
  const { deps } = createDependencies();
  const message = "Contact me at hidden@example.com";

  const result = await protectMessageContactInformation(
    {
      messageId: "message-2",
      messageText: message,
      sourceCategory: "messages",
      context: createContext(),
    },
    deps,
    {
      featureFlags: {
        CONTACT_PROTECTION_ENABLED: false,
      },
    }
  );

  assert.equal(result.protectedMessageText, message);
  assert.equal(result.findings.length, 0);
  assert.equal(result.policyEvaluated, false);
});

test("cross-message references are attached for repeated token patterns", async () => {
  const { deps } = createDependencies();

  await protectMessageContactInformation(
    {
      messageId: "message-3",
      messageText: "Reach me at continuity@example.com",
      sourceCategory: "messages",
      context: createContext(),
    },
    deps,
    {
      featureFlags: {
        CONTACT_PROTECTION_ENABLED: true,
        CROSS_MESSAGE_PROTECTION_ENABLED: true,
      },
    }
  );

  const second = await protectMessageContactInformation(
    {
      messageId: "message-4",
      messageText: "Repeated continuity@example.com contact pattern",
      sourceCategory: "messages",
      context: createContext(),
    },
    deps,
    {
      featureFlags: {
        CONTACT_PROTECTION_ENABLED: true,
        CROSS_MESSAGE_PROTECTION_ENABLED: true,
      },
    }
  );

  assert.ok(second.findings.length > 0);
  assert.ok(second.findings.some((finding) => finding.crossMessageReferences.length > 0));
  assert.equal(second.continuationStatus, "continued_with_review");
});

test("profile plan protects job advertisement contact data", async () => {
  const { deps } = createDependencies();

  const plan = await createProfileProtectionPlan({
    sourceText: "Apply via https://bit.ly/protected-hiring or email profile@example.com",
    sourceCategory: "job_advertisements",
    requestContext: createContext(),
    dependencies: deps,
    featureFlags: {
      CONTACT_PROTECTION_ENABLED: true,
      JOB_AD_CONTACT_PROTECTION_ENABLED: true,
    },
  });

  assert.ok(plan.findings.length > 0);
  assert.match(plan.protectedText, /\[protected-link\]/);
});

test("false-positive records are persisted and emitted", async () => {
  const { deps, events } = createDependencies();

  await recordContactProtectionFalsePositive({
    findingHash: "finding-hash-1",
    correctionMetadata: { reason: "manual review" },
    dependencies: deps,
  });

  const records = await deps.falsePositiveRepository.listByFindingHash("finding-hash-1");
  assert.equal(records.length, 1);
  assert.equal(records[0].outcome, "false_positive");
  assert.ok(events.some((entry) => entry.eventType === "ContactProtectionFalsePositiveRecorded"));
});
