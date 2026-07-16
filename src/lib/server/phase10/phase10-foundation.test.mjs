import test from "node:test";
import assert from "node:assert/strict";
import { getPhase10FeatureFlags, isPhase10FeatureEnabled } from "./feature-flags/index.ts";
import { evaluatePhase10Policies, createPhase10PolicyContext } from "./policy-engine/index.ts";
import { evaluatePhase10BusinessRule } from "./rule-engine/index.ts";
import { createPhase10DomainEvent, createPhase10DomainEventBus } from "./events/index.ts";
import { createPhase10OrganizationContext, requireTenantScope } from "./organization/index.ts";
import { evaluatePhase10SensitiveAction } from "./security/index.ts";
import { createPhase10Logger, sanitizePhase10LogEntry } from "./observability/index.ts";

test("phase10 feature flags default to disabled", () => {
  const flags = getPhase10FeatureFlags();

  assert.equal(flags.PRIME_SHIELD_ENABLED, false);
  assert.equal(flags.PROTECTED_INTERVIEWS_ENABLED, false);
  assert.equal(flags.VIDEO_ROOMS_ENABLED, false);
  assert.equal(flags.SHIELD_INFRA_FOUNDATION_ENABLED, false);
  assert.equal(flags.SHIELD_INTEGRITY_MONITOR_ENABLED, false);
  assert.equal(flags.SHIELD_EVENT_REPLAY_ENABLED, false);
  assert.equal(flags.RECRUITMENT_ORCHESTRATOR_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_SAGAS_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_GRAPHS_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_SNAPSHOTS_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_RECOVERY_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_TIMEOUTS_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_RETRIES_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_SCHEDULER_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_MANUAL_INTERVENTION_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_INSPECTOR_ENABLED, false);
  assert.equal(flags.ORCHESTRATION_VISUALIZATION_ENABLED, false);
  assert.equal(flags.PROTECTED_INTERVIEW_ENABLED, false);
  assert.equal(flags.VIDEO_ROOM_PROVIDER_ENABLED, false);
  assert.equal(flags.INTERVIEW_TOKEN_ENABLED, false);
  assert.equal(flags.INTERVIEW_LIFECYCLE_ENABLED, false);
  assert.equal(flags.PROTECTION_ENGINE_ENABLED, false);
  assert.equal(flags.REDACTION_ENGINE_ENABLED, false);
  assert.equal(flags.PROTECTED_COPY_ENABLED, false);
  assert.equal(flags.AUTO_MASKING_ENABLED, false);
  assert.equal(flags.PROTECTION_EVENTS_ENABLED, false);
  assert.equal(flags.PROTECTION_AUDIT_ENABLED, false);
  assert.equal(flags.PROTECTION_TIMELINE_ENABLED, false);
  assert.equal(flags.TRUST_INTELLIGENCE_FOUNDATION_ENABLED, false);
  assert.equal(flags.TRUST_SIGNAL_MODEL_ENABLED, false);
  assert.equal(flags.CIRCUMVENTION_SIGNAL_MODEL_ENABLED, false);
  assert.equal(flags.PROGRESSIVE_CONFIDENCE_SCORING_ENABLED, false);
  assert.equal(flags.TRUST_EVIDENCE_EXPLAINABILITY_ENABLED, false);
  assert.equal(flags.TRUST_GRAPH_FOUNDATION_ENABLED, false);
  assert.equal(flags.CANDIDATE_RECOMMENDATION_ENGINE_ENABLED, false);
  assert.equal(flags.RISK_AGGREGATION_ENABLED, false);
  assert.equal(flags.HUMAN_REVIEW_OVERRIDE_ENABLED, false);
  assert.equal(isPhase10FeatureEnabled("GOVERNANCE_CENTER_ENABLED"), false);
});

test("policy engine returns explainable disabled policy foundation", () => {
  const decision = evaluatePhase10Policies({
    actorRole: "employer",
    action: "request_interview_invitation",
    facts: { candidateSelected: false },
  });

  assert.equal(decision.allowed, false);
  assert.match(decision.explanation, /No enabled policy matched/i);
  assert.equal(Array.isArray(decision.matchedPolicies), true);
});

test("business rule engine explains blocked interview activation", () => {
  const context = createPhase10PolicyContext({
    actorRole: "prime_global_recruiter",
    action: "activate_interview",
    facts: {
      candidateSelected: true,
      invitationAccepted: false,
      currentTermsAccepted: false,
      staffApproval: true,
      hasActiveFreeze: false,
      videoRoomsEnabled: false,
    },
  });

  const result = evaluatePhase10BusinessRule("Activate Interview", context);

  assert.equal(result.allowed, false);
  assert.ok(result.failedConditions.length > 0);
  assert.match(result.explanation, /invitation/i);
  assert.ok(result.requiredNextActions.length > 0);
});

test("domain event bus records and dispatches events", async () => {
  const bus = createPhase10DomainEventBus();
  const event = createPhase10DomainEvent({
    eventType: "CandidateSelected",
    actorId: "user-1",
    actorRole: "prime_global_recruiter",
    organizationId: "prime-global",
    decisionOrigin: "staff_decision",
    payload: { candidateId: "candidate-1" },
  });

  const seen = [];
  const unsubscribe = bus.register("CandidateSelected", async (entry) => {
    seen.push(entry);
  });

  await bus.publish(event);
  unsubscribe();

  assert.equal(seen.length, 1);
  assert.equal(seen[0].eventType, "CandidateSelected");
  assert.ok(seen[0].eventId.startsWith("phase10_"));
});

test("tenant context resolves to Prime Global default safely", () => {
  const context = createPhase10OrganizationContext();

  assert.equal(context.organizationId, "prime-global");
  assert.equal(context.tenantId, null);
  assert.equal(context.isPrimeGlobalDefault, true);

  const scoped = requireTenantScope(context);
  assert.equal(scoped.allowed, true);
  assert.match(scoped.explanation, /Prime Global organization/i);
});

test("unauthorized sensitive actions are blocked before policy or business rules run", () => {
  const response = evaluatePhase10SensitiveAction({
    authenticated: false,
    organization: createPhase10OrganizationContext(),
  });

  assert.equal(response.allowed, false);
  assert.match(response.explanation, /Authentication is required/i);
  assert.equal(response.humanReviewRequired, true);
});

test("phase10 logger redacts sensitive metadata before emission", () => {
  const sanitized = sanitizePhase10LogEntry({
    requestId: "req-1",
    eventId: "evt-1",
    result: "success",
    decisionOrigin: "system_rule",
    metadata: {
      accessToken: "secret-token",
      contactDetails: "john@example.com",
      nested: { paymentCredentials: "card-123", note: "ok" },
    },
  });

  assert.equal(sanitized.metadata.accessToken, "[redacted]");
  assert.equal(sanitized.metadata.contactDetails, "[redacted]");
  assert.equal(sanitized.metadata.nested.paymentCredentials, "[redacted]");

  const emitted = [];
  const logger = createPhase10Logger((entry) => emitted.push(entry));
  logger.audit({
    requestId: "req-2",
    eventId: "evt-2",
    result: "warning",
    decisionOrigin: "automated_detection",
    metadata: { privateCv: "should not persist" },
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].metadata.privateCv, "[redacted]");
});
