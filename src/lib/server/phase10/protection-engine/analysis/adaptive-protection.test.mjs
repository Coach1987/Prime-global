import test from "node:test";
import assert from "node:assert/strict";

import { getPhase10FeatureFlags } from "../../feature-flags/index.ts";
import {
  CANDIDATE_FRIENDLY_PROTECTION_EXPLANATION,
  applyDecisionFeedback,
  approveFieldRevealCommand,
  createDisclosureManifest,
  createExplainableProtectionDecision,
  createInMemoryProtectionPlanStore,
  createNoopProtectionControlDependencies,
  createProtectionPlan,
  evaluateAdaptiveProtectionLevel,
  evaluateProtectionLevelCommand,
  getDisclosureManifestQuery,
  getEmployerSafeProjectionForPlan,
  getProtectionDecisionExplanationQuery,
  requestFieldRevealCommand,
  revokeFieldRevealCommand,
  transitionDisclosureState,
} from "./index.ts";

function baseContext(overrides = {}) {
  return {
    recruitmentWorkflowStage: "screening",
    actorRole: "employer",
    organizationScope: "org-1",
    tenantScope: "tenant-1",
    policyVersion: "policy-v8.5.1",
    candidateConsentVersion: "consent-v2",
    employerVerificationStatus: "verified",
    interviewStatus: "scheduled",
    paymentStatus: "not_applicable",
    contractState: "draft",
    activeFreezeState: false,
    activeCriticalViolationState: false,
    authorizedStaffOverride: false,
    fieldLevelDisclosurePolicy: "default-v1",
    ...overrides,
  };
}

function createPlan(overrides = {}) {
  return createProtectionPlan({
    planId: "plan-1",
    organizationScope: "org-1",
    candidateScope: "candidate-1",
    originalObjectReference: "private://original/candidate-1/cv.pdf",
    protectedCopyTargetReference: "protected://candidate-1/cv-protected.pdf",
    publicProfileTargetReference: "public://candidate-1/profile-v1.json",
    findings: [],
    ...overrides,
  });
}

function createDependencies(plan = createPlan()) {
  const planStore = createInMemoryProtectionPlanStore([plan]);
  const deps = createNoopProtectionControlDependencies(planStore);
  const events = [];
  const audit = [];
  const evidence = [];

  return {
    deps: {
      ...deps,
      async emitDomainEvent(eventType, metadata) {
        events.push({ eventType, metadata });
      },
      async appendAudit(event, metadata) {
        audit.push({ event, metadata });
      },
      async appendEvidence(metadataHash, metadata) {
        evidence.push({ metadataHash, metadata });
      },
      async workflowHook() {},
      async orchestratorHook() {},
      async appendTimeline() {},
    },
    events,
    audit,
    evidence,
  };
}

test("default strict privacy", () => {
  const level = evaluateAdaptiveProtectionLevel(
    baseContext({
      activeFreezeState: true,
    })
  );
  assert.equal(level, "strict_private");
});

test("workflow-stage-based protection", () => {
  const level = evaluateAdaptiveProtectionLevel(baseContext({ recruitmentWorkflowStage: "contract", contractState: "signed" }));
  assert.equal(level, "contract_stage_limited_reveal");
});

test("role-based protection", () => {
  const level = evaluateAdaptiveProtectionLevel(baseContext({ actorRole: "prime_global_staff", authorizedStaffOverride: true }));
  assert.equal(level, "staff_review");
});

test("policy-version explanation", () => {
  const decision = createExplainableProtectionDecision({
    context: baseContext({ policyVersion: "policy-v9" }),
    policyId: "POLICY-1",
    ruleId: "PG-EMAIL-001",
    fieldOrFindingCategory: "personal_email",
    previousDisclosureState: "masked",
    resultingDisclosureState: "masked",
    reasonCode: "PG-EMAIL-001",
    internalExplanation: "Personal email remains masked.",
    employerFriendlyExplanation: "Contact details are protected at this stage.",
  });

  assert.equal(decision.policyVersion, "policy-v9");
  assert.equal(decision.ruleId, "PG-EMAIL-001");
});

test("field-level disclosure manifest", () => {
  const manifest = createDisclosureManifest("strict_private");
  assert.ok(manifest.fields.find((field) => field.fieldCategory === "professional_name"));
  assert.ok(manifest.fields.find((field) => field.fieldCategory === "original_cv"));
});

test("professional field reveal", async () => {
  const { deps } = createDependencies();
  const plan = await approveFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "professional_name",
      approvedByStaffId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      justification: "Approved for interview progression.",
    },
    deps
  );

  const field = plan.currentDisclosureManifest.fields.find((item) => item.fieldCategory === "professional_name");
  assert.equal(field?.disclosureState, "revealed");
});

test("personal email remains masked", async () => {
  const { deps } = createDependencies();

  await assert.rejects(
    () =>
      approveFieldRevealCommand(
        {
          planId: "plan-1",
          fieldCategory: "personal_email",
          approvedByStaffId: "staff-1",
          context: baseContext({ actorRole: "prime_global_staff" }),
          justification: "Not allowed.",
        },
        deps
      ),
    /invalid_disclosure_transition/
  );
});

test("personal phone remains masked", async () => {
  const { deps } = createDependencies();

  await assert.rejects(
    () =>
      approveFieldRevealCommand(
        {
          planId: "plan-1",
          fieldCategory: "personal_phone",
          approvedByStaffId: "staff-1",
          context: baseContext({ actorRole: "prime_global_staff" }),
          justification: "Not allowed.",
        },
        deps
      ),
    /invalid_disclosure_transition/
  );
});

test("passport remains staff-only", async () => {
  const { deps } = createDependencies();

  await assert.rejects(
    () =>
      approveFieldRevealCommand(
        {
          planId: "plan-1",
          fieldCategory: "passport_number",
          approvedByStaffId: "staff-1",
          context: baseContext({ actorRole: "prime_global_staff" }),
          justification: "Not allowed.",
        },
        deps
      ),
    /immutable_field_reveal_denied/
  );
});

test("original CV cannot be revealed", async () => {
  const { deps } = createDependencies();

  await assert.rejects(
    () =>
      approveFieldRevealCommand(
        {
          planId: "plan-1",
          fieldCategory: "original_cv",
          approvedByStaffId: "staff-1",
          context: baseContext({ actorRole: "prime_global_staff" }),
          justification: "Not allowed.",
        },
        deps
      ),
    /immutable_field_reveal_denied/
  );
});

test("private documents cannot be revealed", async () => {
  const { deps } = createDependencies();

  await assert.rejects(
    () =>
      approveFieldRevealCommand(
        {
          planId: "plan-1",
          fieldCategory: "private_documents",
          approvedByStaffId: "staff-1",
          context: baseContext({ actorRole: "prime_global_staff" }),
          justification: "Not allowed.",
        },
        deps
      ),
    /immutable_field_reveal_denied/
  );
});

test("partial reveal approval", async () => {
  const { deps } = createDependencies();

  const decision = await requestFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "portfolio",
      requestedByActorId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      reason: "Allow portfolio sharing for screening.",
    },
    deps
  );

  assert.equal(decision.resultingDisclosureState, "revealed");
});

test("reveal denial", async () => {
  const { deps } = createDependencies();

  const decision = await requestFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "original_cv",
      requestedByActorId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      reason: "Attempt direct CV reveal.",
    },
    deps
  );

  assert.equal(decision.resultingDisclosureState, "staff_only");
  assert.equal(decision.reasonCode, "IMMUTABLE_PRIVACY_RESTRICTION");
});

test("reveal revocation", async () => {
  const { deps } = createDependencies();
  await approveFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "professional_name",
      approvedByStaffId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      justification: "Temporary reveal",
    },
    deps
  );

  const plan = await revokeFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "professional_name",
      revokedByStaffId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      reason: "Revoke after stage change",
    },
    deps
  );

  const field = plan.currentDisclosureManifest.fields.find((item) => item.fieldCategory === "professional_name");
  assert.equal(field?.disclosureState, "masked");
});

test("reversible transition", () => {
  const result = transitionDisclosureState({
    fieldCategory: "professional_name",
    fromState: "revealed",
    toState: "masked",
    context: baseContext({ actorRole: "prime_global_staff" }),
    policyId: "policy-1",
    ruleId: "rule-1",
    actorId: "staff-1",
  });

  assert.equal(result.allowed, true);
  assert.equal(result.resultingState, "masked");
});

test("invalid transition", () => {
  const result = transitionDisclosureState({
    fieldCategory: "professional_name",
    fromState: "hidden",
    toState: "revealed",
    context: baseContext({ actorRole: "prime_global_staff" }),
    policyId: "policy-1",
    ruleId: "rule-1",
    actorId: "staff-1",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.errorCode, "invalid_disclosure_transition");
});

test("active freeze blocks reveal", () => {
  const result = transitionDisclosureState({
    fieldCategory: "portfolio",
    fromState: "protected_placeholder",
    toState: "revealed",
    context: baseContext({ actorRole: "prime_global_staff", activeFreezeState: true }),
    policyId: "policy-1",
    ruleId: "rule-1",
    actorId: "staff-1",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.errorCode, "reveal_blocked_by_protection_state");
});

test("critical violation blocks reveal", () => {
  const result = transitionDisclosureState({
    fieldCategory: "portfolio",
    fromState: "protected_placeholder",
    toState: "revealed",
    context: baseContext({ actorRole: "prime_global_staff", activeCriticalViolationState: true }),
    policyId: "policy-1",
    ruleId: "rule-1",
    actorId: "staff-1",
  });

  assert.equal(result.allowed, false);
  assert.equal(result.errorCode, "reveal_blocked_by_protection_state");
});

test("payment prerequisite where configured", async () => {
  const { deps } = createDependencies();
  deps.evaluateBusinessRule = async () => ({
    ruleName: "Unlock Contract",
    version: "1.0.0",
    allowed: false,
    passedConditions: [],
    failedConditions: [],
    blockingReasons: ["Payment verification is required."],
    requiredNextActions: ["Verify payment"],
    explanation: "Payment missing",
    context: {
      actorId: null,
      actorRole: "employer",
      action: "phase10.protection.level.evaluate",
      organization: { organizationId: "org-1", tenantId: "tenant-1", organizationType: "employer", source: "request" },
      subjectId: null,
      subjectType: null,
      facts: {},
    },
  });

  const result = await evaluateProtectionLevelCommand({ planId: "plan-1", context: baseContext({ paymentStatus: "pending" }) }, deps);
  assert.equal(result.protectionLevel, "strict_private");
});

test("contract-state prerequisite where configured", async () => {
  const { deps } = createDependencies();
  const result = await evaluateProtectionLevelCommand(
    { planId: "plan-1", context: baseContext({ recruitmentWorkflowStage: "contract", contractState: "signed" }) },
    deps
  );
  assert.equal(result.protectionLevel, "contract_stage_limited_reveal");
});

test("consent-version mismatch", async () => {
  const { deps } = createDependencies();
  deps.evaluatePolicy = async () => ({
    allowed: false,
    matchedPolicies: [],
    blockingReasons: ["Consent version mismatch"],
    requiredNextActions: ["Update consent"],
    explanation: "Consent mismatch",
  });

  const result = await evaluateProtectionLevelCommand(
    { planId: "plan-1", context: baseContext({ candidateConsentVersion: "consent-v1" }) },
    deps
  );

  assert.equal(result.protectionLevel, "strict_private");
});

test("cross-organization denial", async () => {
  const plan = createPlan({ organizationScope: "org-1" });
  const { deps } = createDependencies(plan);

  await assert.rejects(
    () =>
      requestFieldRevealCommand(
        {
          planId: "plan-1",
          fieldCategory: "portfolio",
          requestedByActorId: "staff-1",
          context: baseContext({ actorRole: "prime_global_staff", organizationScope: "org-2" }),
          reason: "Cross-org request",
        },
        deps
      ),
    /cross_organization_denied/
  );
});

test("unauthorized staff action", async () => {
  const { deps } = createDependencies();

  await assert.rejects(
    () =>
      approveFieldRevealCommand(
        {
          planId: "plan-1",
          fieldCategory: "professional_name",
          approvedByStaffId: "employer-1",
          context: baseContext({ actorRole: "employer" }),
          justification: "Attempt unauthorized approval",
        },
        deps
      ),
    /unauthorized_staff_action/
  );
});

test("employer-safe projection", async () => {
  const { deps } = createDependencies();
  await approveFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "portfolio",
      approvedByStaffId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      justification: "approved",
    },
    deps
  );

  const projection = await getEmployerSafeProjectionForPlan("plan-1", "analysis-1", deps);
  assert.equal(projection.fields.some((field) => field.fieldCategory === "original_cv"), false);
  assert.equal(projection.fields.some((field) => field.fieldCategory === "private_documents"), false);
});

test("candidate-friendly explanation", () => {
  const decision = createExplainableProtectionDecision({
    context: baseContext(),
    policyId: "policy-1",
    ruleId: "rule-1",
    fieldOrFindingCategory: "professional_name",
    previousDisclosureState: "protected_placeholder",
    resultingDisclosureState: "revealed",
    reasonCode: "APPROVED",
    internalExplanation: "Allowed by policy",
    employerFriendlyExplanation: "Professional details available",
  });

  assert.equal(decision.candidateFriendlyExplanation, CANDIDATE_FRIENDLY_PROTECTION_EXPLANATION);
});

test("no raw private data in logs/events/evidence", async () => {
  const { deps, events, audit, evidence } = createDependencies();

  await requestFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "portfolio",
      requestedByActorId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      reason: "share portfolio",
    },
    deps
  );

  const all = JSON.stringify({ events, audit, evidence });
  assert.equal(all.includes("private://original"), false);
  assert.equal(all.includes("@"), false);
});

test("false-positive correction", () => {
  const decision = createExplainableProtectionDecision({
    context: baseContext(),
    policyId: "policy-1",
    ruleId: "PG-EMAIL-001",
    fieldOrFindingCategory: "personal_email",
    previousDisclosureState: "masked",
    resultingDisclosureState: "masked",
    reasonCode: "PG-EMAIL-001",
    internalExplanation: "masked",
    employerFriendlyExplanation: "masked",
  });

  const updated = applyDecisionFeedback(decision, "false_positive", "manual correction");
  assert.equal(updated.feedbackStatus, "false_positive");
  assert.match(updated.internalExplanation, /manual correction/);
});

test("query foundations return disclosure manifest and decision explanation", async () => {
  const { deps } = createDependencies();
  await evaluateProtectionLevelCommand({ planId: "plan-1", context: baseContext() }, deps);

  const decision = await requestFieldRevealCommand(
    {
      planId: "plan-1",
      fieldCategory: "portfolio",
      requestedByActorId: "staff-1",
      context: baseContext({ actorRole: "prime_global_staff" }),
      reason: "progression",
    },
    deps
  );

  const manifest = await getDisclosureManifestQuery({ planId: "plan-1" }, deps);
  const explanation = await getProtectionDecisionExplanationQuery({ decisionId: decision.decisionId }, deps);

  assert.ok(manifest.manifestId);
  assert.equal(explanation.decisionId, decision.decisionId);
});

test("all new flags disabled by default", () => {
  const flags = getPhase10FeatureFlags();
  assert.equal(flags.ADAPTIVE_PROTECTION_ENABLED, false);
  assert.equal(flags.EXPLAINABLE_PROTECTION_ENABLED, false);
  assert.equal(flags.REVERSIBLE_PROTECTION_ENABLED, false);
  assert.equal(flags.FIELD_LEVEL_DISCLOSURE_ENABLED, false);
  assert.equal(flags.PARTIAL_REVEAL_ENABLED, false);
  assert.equal(flags.REVEAL_APPROVAL_ENABLED, false);
  assert.equal(flags.DISCLOSURE_MANIFEST_ENABLED, false);
});
