import test from "node:test";
import assert from "node:assert/strict";

import {
  InMemoryProtectionRuleRegistry,
  ProtectionRuleGovernanceService,
  ProtectionRuleResolver,
  ProtectionRuleValidator,
  createProtectionRuleSnapshot,
  initialProtectionRules,
} from "../index.ts";
import { getPhase10FeatureFlags } from "../../../feature-flags/index.ts";

function registry(rules = initialProtectionRules, options = {}) {
  return new InMemoryProtectionRuleRegistry(rules.map((rule) => ({ ...rule })), {
    registryVersion: "stage8_75.registry.v1",
    now: "2026-07-16T00:00:00.000Z",
    ...options,
  });
}

function createRuleOverride(overrides = {}) {
  const base = { ...initialProtectionRules[0] };
  return {
    ...base,
    ...overrides,
    policyEnginePolicyIds: overrides.policyEnginePolicyIds ?? base.policyEnginePolicyIds,
    businessRuleIds: overrides.businessRuleIds ?? base.businessRuleIds,
    findingTypes: overrides.findingTypes ?? base.findingTypes,
    fieldCategories: overrides.fieldCategories ?? base.fieldCategories,
    allowedDisclosureStates: overrides.allowedDisclosureStates ?? base.allowedDisclosureStates,
    forbiddenDisclosureStates: overrides.forbiddenDisclosureStates ?? base.forbiddenDisclosureStates,
    actorRoleConstraints: overrides.actorRoleConstraints ?? base.actorRoleConstraints,
    workflowStageConstraints: overrides.workflowStageConstraints ?? base.workflowStageConstraints,
  };
}

test("registry creation", () => {
  const result = registry();
  assert.ok(result.listRulesDeterministic().length > 0);
});

test("rule lookup by ID", () => {
  const result = registry();
  assert.equal(result.getRuleById("PG-EMAIL-001")?.ruleId, "PG-EMAIL-001");
});

test("lookup by finding type", () => {
  const result = registry();
  assert.ok(result.listByFindingType("email").length > 0);
});

test("lookup by category", () => {
  const result = registry();
  assert.ok(result.listByCategory("contact_information").length > 0);
});

test("active version resolution", () => {
  const rules = [
    createRuleOverride({ ruleId: "PG-EMAIL-001", stableRuleKey: "email-contact", ruleVersion: "1.0.0" }),
    createRuleOverride({ ruleId: "PG-EMAIL-002", stableRuleKey: "email-contact", ruleVersion: "1.1.0" }),
  ];
  const result = registry(rules);
  assert.equal(result.resolveActiveVersion("email-contact", "2026-07-16T00:00:00.000Z")?.ruleVersion, "1.1.0");
});

test("future scheduled version", () => {
  const rules = [
    createRuleOverride({ ruleId: "PG-EMAIL-001", stableRuleKey: "email-contact", ruleVersion: "1.0.0" }),
    createRuleOverride({
      ruleId: "PG-EMAIL-002",
      stableRuleKey: "email-contact",
      ruleVersion: "2.0.0",
      lifecycleState: "scheduled",
      effectiveFrom: "2030-01-01T00:00:00.000Z",
    }),
  ];
  const result = registry(rules);
  assert.equal(result.resolveActiveVersion("email-contact", "2026-07-16T00:00:00.000Z")?.ruleVersion, "1.0.0");
});

test("expired rule rejection", () => {
  assert.throws(
    () =>
      registry([
        createRuleOverride({
          ruleId: "PG-EMAIL-001",
          lifecycleState: "active",
          effectiveFrom: "2020-01-01T00:00:00.000Z",
          effectiveUntil: "2021-01-01T00:00:00.000Z",
        }),
      ]),
    /expired_active_rule/
  );
});

test("duplicate rule rejection", () => {
  assert.throws(
    () =>
      registry([
        createRuleOverride({ ruleId: "PG-EMAIL-001", stableRuleKey: "email-contact", ruleVersion: "1.0.0" }),
        createRuleOverride({ ruleId: "PG-EMAIL-001", stableRuleKey: "email-contact-dup", ruleVersion: "1.0.1" }),
      ]),
    /duplicate_active_rule_id/
  );
});

test("duplicate active version rejection", () => {
  assert.throws(
    () =>
      registry([
        createRuleOverride({ ruleId: "PG-EMAIL-001", stableRuleKey: "email-contact", ruleVersion: "1.0.0" }),
        createRuleOverride({ ruleId: "PG-EMAIL-002", stableRuleKey: "email-contact", ruleVersion: "1.0.0" }),
      ]),
    /duplicate_active_rule_version/
  );
});

test("deprecated rule resolution", () => {
  const rules = [
    createRuleOverride({ ruleId: "PG-EMAIL-001", deprecated: true, lifecycleState: "deprecated", replacementRuleId: "PG-EMAIL-002" }),
    createRuleOverride({ ruleId: "PG-EMAIL-002", stableRuleKey: "email-contact-next", ruleVersion: "2.0.0" }),
  ];
  const result = registry(rules).resolveDeprecatedRule("PG-EMAIL-001");
  assert.equal(result.current?.deprecated, true);
  assert.equal(result.replacement?.ruleId, "PG-EMAIL-002");
});

test("replacement rule resolution", () => {
  const rules = [
    createRuleOverride({ ruleId: "PG-EMAIL-001", replacementRuleId: "PG-EMAIL-002", deprecated: true, lifecycleState: "deprecated" }),
    createRuleOverride({ ruleId: "PG-EMAIL-002", stableRuleKey: "email-contact-next", ruleVersion: "2.0.0" }),
  ];
  assert.equal(registry(rules).getReplacementRule("PG-EMAIL-001")?.ruleId, "PG-EMAIL-002");
});

test("circular replacement rejection", () => {
  assert.throws(
    () =>
      registry([
        createRuleOverride({ ruleId: "PG-EMAIL-001", replacementRuleId: "PG-EMAIL-002", deprecated: true, lifecycleState: "deprecated" }),
        createRuleOverride({ ruleId: "PG-EMAIL-002", replacementRuleId: "PG-EMAIL-001", deprecated: true, lifecycleState: "deprecated" }),
      ]),
    /circular_replacement_chain/
  );
});

test("invalid disclosure-state conflict", () => {
  const validator = new ProtectionRuleValidator();
  const result = validator.validate(
    createRuleOverride({
      allowedDisclosureStates: ["masked", "revealed"],
      forbiddenDisclosureStates: ["revealed"],
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "state_conflict"));
});

test("immutable-field reveal rejection", () => {
  const validator = new ProtectionRuleValidator();
  const result = validator.validate(
    createRuleOverride({
      immutablePrivacy: true,
      allowedDisclosureStates: ["revealed"],
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "immutable_reveal_forbidden"));
});

test("original CV reveal rejection", () => {
  const validator = new ProtectionRuleValidator();
  const result = validator.validate(
    createRuleOverride({
      fieldCategories: ["original_cv"],
      allowedDisclosureStates: ["revealed"],
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "original_cv_reveal_forbidden"));
});

test("private document reveal rejection", () => {
  const validator = new ProtectionRuleValidator();
  const result = validator.validate(
    createRuleOverride({
      fieldCategories: ["private_documents"],
      allowedDisclosureStates: ["revealed"],
    })
  );
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "private_documents_reveal_forbidden"));
});

test("strict privacy fallback", () => {
  const result = new ProtectionRuleResolver(registry(), "stage8_75.registry.v1").resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "screening",
    actorRole: "candidate",
    organizationId: "org-unknown",
    tenantId: null,
    policyVersion: "policy-v1",
    consentVersion: "unknown-consent",
    employerVerificationStatus: "unverified",
    interviewStatus: "not_started",
    paymentStatus: "pending",
    contractState: "draft",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });

  assert.equal(result.fallbackRuleUsed, true);
  assert.equal(result.defaultDisclosureState, "staff_only");
});

test("actor-role resolution", () => {
  const rules = [
    createRuleOverride({ ruleId: "PG-EMAIL-001", actorRoleConstraints: ["employer"] }),
  ];
  const resolved = new ProtectionRuleResolver(registry(rules), "stage8_75.registry.v1").resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "screening",
    actorRole: "employer",
    organizationId: "org-1",
    tenantId: null,
    policyVersion: "policy-v1",
    consentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "scheduled",
    paymentStatus: "verified",
    contractState: "signed",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });
  assert.equal(resolved.fallbackRuleUsed, false);
});

test("workflow-stage resolution", () => {
  const rules = [createRuleOverride({ workflowStageConstraints: ["contract"] })];
  const resolved = new ProtectionRuleResolver(registry(rules), "stage8_75.registry.v1").resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "contract",
    actorRole: "employer",
    organizationId: "org-1",
    tenantId: null,
    policyVersion: "policy-v1",
    consentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "completed",
    paymentStatus: "verified",
    contractState: "signed",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });
  assert.equal(resolved.fallbackRuleUsed, false);
});

test("organization-scope resolution", () => {
  const rules = [createRuleOverride({ organizationScope: "org-1" })];
  const resolved = new ProtectionRuleResolver(registry(rules), "stage8_75.registry.v1").resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "screening",
    actorRole: "employer",
    organizationId: "org-1",
    tenantId: null,
    policyVersion: "policy-v1",
    consentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "scheduled",
    paymentStatus: "not_applicable",
    contractState: "draft",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });
  assert.equal(resolved.fallbackRuleUsed, false);
});

test("cross-organization denial", () => {
  const rules = [createRuleOverride({ organizationScope: "org-1" })];
  const resolved = new ProtectionRuleResolver(registry(rules), "stage8_75.registry.v1").resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "screening",
    actorRole: "employer",
    organizationId: "org-2",
    tenantId: null,
    policyVersion: "policy-v1",
    consentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "scheduled",
    paymentStatus: "not_applicable",
    contractState: "draft",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });
  assert.equal(resolved.fallbackRuleUsed, true);
});

test("policy-link preservation", () => {
  const resolved = new ProtectionRuleResolver(registry(), "stage8_75.registry.v1").resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "screening",
    actorRole: "employer",
    organizationId: "org-1",
    tenantId: "tenant-1",
    policyVersion: "policy-v1",
    consentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "scheduled",
    paymentStatus: "not_applicable",
    contractState: "draft",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });
  assert.ok(resolved.policyLinks.length > 0);
});

test("business-rule-link preservation", () => {
  const resolved = new ProtectionRuleResolver(registry(), "stage8_75.registry.v1").resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "screening",
    actorRole: "employer",
    organizationId: "org-1",
    tenantId: "tenant-1",
    policyVersion: "policy-v1",
    consentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "scheduled",
    paymentStatus: "not_applicable",
    contractState: "draft",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });
  assert.ok(resolved.businessRuleLinks.length > 0);
});

test("exact rule-version decision reference", () => {
  const reg = registry();
  const resolver = new ProtectionRuleResolver(reg, "stage8_75.registry.v1");
  const resolved = resolver.resolve({
    findingType: "email",
    fieldCategory: "personal_email",
    workflowStage: "screening",
    actorRole: "employer",
    organizationId: "org-1",
    tenantId: "tenant-1",
    policyVersion: "policy-v1",
    consentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "scheduled",
    paymentStatus: "not_applicable",
    contractState: "draft",
    freezeState: false,
    criticalViolationState: false,
    evaluationTimestamp: "2026-07-16T00:00:00.000Z",
  });

  const reference = resolver.createDecisionReference(resolved);
  assert.equal(reference.ruleId, resolved.selectedRuleId);
  assert.equal(reference.ruleVersion, resolved.selectedVersion);
});

test("rule snapshot privacy", () => {
  const snapshot = createProtectionRuleSnapshot(initialProtectionRules[0]);
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("private://"), false);
  assert.equal(serialized.includes("@"), false);
});

test("candidate-friendly wording validation", () => {
  const validator = new ProtectionRuleValidator();
  const invalid = createRuleOverride({ candidateFriendlyExplanation: "OCR detector confidence score is high." });
  const result = validator.validate(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some((item) => item.code === "candidate_wording_violation"));
});

test("disabled rule not enforceable", () => {
  assert.throws(
    () =>
      registry([
        createRuleOverride({
          lifecycleState: "active",
          enabled: false,
        }),
      ]),
    /disabled_rule_enforceable/
  );
});

test("governance authorization foundation", async () => {
  const reg = registry();
  const resolver = new ProtectionRuleResolver(reg, "stage8_75.registry.v1");
  const service = new ProtectionRuleGovernanceService(
    {
      registry: reg,
      draftStore: new Map(),
      async appendAudit() {},
      async appendEvidence() {},
      async emitEvent() {},
    },
    resolver
  );

  await assert.rejects(
    () =>
      service.listProtectionRules({
        actor: { actorId: "employer-1", role: "employer" },
      }),
    /governance_authorization_denied/
  );
});

test("privacy-safe events/audit/evidence", async () => {
  const events = [];
  const audit = [];
  const evidence = [];

  const reg = registry();
  const resolver = new ProtectionRuleResolver(reg, "stage8_75.registry.v1");
  const service = new ProtectionRuleGovernanceService(
    {
      registry: reg,
      draftStore: new Map(),
      async appendAudit(event, metadata) {
        audit.push({ event, metadata });
      },
      async appendEvidence(metadataHash, metadata) {
        evidence.push({ metadataHash, metadata });
      },
      async emitEvent(eventType, metadata) {
        events.push({ eventType, metadata });
      },
    },
    resolver
  );

  await service.resolveProtectionRule({
    actor: { actorId: "staff-1", role: "prime_global_staff" },
    input: {
      findingType: "email",
      fieldCategory: "personal_email",
      workflowStage: "screening",
      actorRole: "employer",
      organizationId: "org-1",
      tenantId: "tenant-1",
      policyVersion: "policy-v1",
      consentVersion: "consent-v2",
      employerVerificationStatus: "verified",
      interviewStatus: "scheduled",
      paymentStatus: "not_applicable",
      contractState: "draft",
      freezeState: false,
      criticalViolationState: false,
      evaluationTimestamp: "2026-07-16T00:00:00.000Z",
    },
  });

  const serialized = JSON.stringify({ events, audit, evidence });
  assert.equal(serialized.includes("private://"), false);
  assert.equal(serialized.includes("@"), false);
});

test("all new flags disabled by default", () => {
  const flags = getPhase10FeatureFlags();
  assert.equal(flags.PROTECTION_RULES_REGISTRY_ENABLED, false);
  assert.equal(flags.PROTECTION_RULE_VERSIONING_ENABLED, false);
  assert.equal(flags.PROTECTION_RULE_RESOLUTION_ENABLED, false);
  assert.equal(flags.PROTECTION_RULE_GOVERNANCE_ENABLED, false);
  assert.equal(flags.PROTECTION_RULE_SNAPSHOTS_ENABLED, false);
});
