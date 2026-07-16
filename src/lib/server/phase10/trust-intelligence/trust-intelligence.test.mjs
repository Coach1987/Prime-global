import test from "node:test";
import assert from "node:assert/strict";

import { getPhase10FeatureFlags } from "../feature-flags/index.ts";
import { createAllEnabledTrustIntelligenceFlags, getTrustIntelligenceFeatureFlags } from "./feature-flags.ts";
import { Stage10RiskAggregationEngine } from "./aggregation.ts";
import { createCandidateFriendlyRecommendation } from "./recommendations.ts";
import { applyHumanReviewOverride, createHumanReviewPacket } from "./review.ts";
import { createInMemoryTrustGraphRepository } from "./graph.ts";
import { createCircumventionSignal, createTrustSignal } from "./testing/factories.ts";

function createEvaluationInput(overrides = {}) {
  return {
    organizationId: "org-1",
    tenantId: null,
    candidateId: "candidate-1",
    conversationId: "conversation-1",
    trustSignals: [createTrustSignal()],
    circumventionSignals: [createCircumventionSignal()],
    policyVersion: "policy-v1",
    ...overrides,
  };
}

test("trust intelligence feature flags default to disabled", () => {
  const flags = getTrustIntelligenceFeatureFlags(getPhase10FeatureFlags());

  assert.equal(flags.TRUST_INTELLIGENCE_FOUNDATION_ENABLED, false);
  assert.equal(flags.TRUST_SIGNAL_MODEL_ENABLED, false);
  assert.equal(flags.CIRCUMVENTION_SIGNAL_MODEL_ENABLED, false);
  assert.equal(flags.PROGRESSIVE_CONFIDENCE_SCORING_ENABLED, false);
  assert.equal(flags.TRUST_EVIDENCE_EXPLAINABILITY_ENABLED, false);
  assert.equal(flags.TRUST_GRAPH_FOUNDATION_ENABLED, false);
  assert.equal(flags.CANDIDATE_RECOMMENDATION_ENGINE_ENABLED, false);
  assert.equal(flags.RISK_AGGREGATION_ENABLED, false);
  assert.equal(flags.HUMAN_REVIEW_OVERRIDE_ENABLED, false);
});

test("all-enabled helper returns true for all trust flags", () => {
  const flags = createAllEnabledTrustIntelligenceFlags();
  assert.equal(Object.values(flags).every(Boolean), true);
});

test("risk aggregation produces explainable evidence references", () => {
  const engine = new Stage10RiskAggregationEngine();
  const result = engine.aggregate(createEvaluationInput());

  assert.ok(result.evidenceReferences.length > 0);
  assert.ok(result.explainableSummary.includes("human judgement"));
  assert.ok(result.trustScore.steps.every((step) => step.evidenceReferenceIds.length > 0));
});

test("candidate recommendation always allows continuation", () => {
  const engine = new Stage10RiskAggregationEngine();
  const aggregate = engine.aggregate(createEvaluationInput());
  const recommendation = createCandidateFriendlyRecommendation({ aggregate });

  assert.equal(recommendation.recommendations[0].continuationAllowed, true);
  assert.equal(recommendation.recommendations[0].humanReviewAvailable, true);
  assert.ok(["continue_normally", "continue_with_review"].includes(recommendation.continuationStatus));
});

test("human review packet enforces override path", () => {
  const engine = new Stage10RiskAggregationEngine();
  const evaluation = createEvaluationInput();
  const aggregate = engine.aggregate(evaluation);
  const packet = createHumanReviewPacket({ evaluationInput: evaluation, aggregate });

  assert.equal(packet.overrideRequired, true);
  assert.equal(packet.evidenceReferences.length > 0, true);
});

test("human review override can reduce automated restrictions", () => {
  const engine = new Stage10RiskAggregationEngine();
  const aggregate = engine.aggregate(
    createEvaluationInput({
      trustSignals: [createTrustSignal({ confidence: 0.2 })],
      circumventionSignals: [createCircumventionSignal({ confidence: 0.95, reviewRecommended: true })],
    })
  );

  const overridden = applyHumanReviewOverride({
    aggregate,
    decision: {
      decisionId: "decision-1",
      reviewerId: "staff-1",
      outcome: "allow_continue",
      reviewerExplanation: "context confirmed",
      overrideApplied: true,
      createdAt: new Date().toISOString(),
    },
  });

  assert.equal(overridden.blockedActions.length, 0);
  assert.equal(overridden.recommendedHumanReview, false);
});

test("trust graph abstractions support nodes and edges", async () => {
  const repository = createInMemoryTrustGraphRepository();

  await repository.upsertNode({
    nodeId: "candidate-1",
    nodeType: "candidate",
    nodeReference: "candidate:candidate-1",
  });

  await repository.upsertNode({
    nodeId: "signal-1",
    nodeType: "signal",
    nodeReference: "signal:trust-1",
  });

  await repository.upsertEdge({
    edgeId: "edge-1",
    fromNodeId: "candidate-1",
    toNodeId: "signal-1",
    edgeType: "supports",
    weight: 0.8,
  });

  const node = await repository.getNode("candidate-1");
  const edges = await repository.listNodeEdges("candidate-1");

  assert.equal(node?.nodeType, "candidate");
  assert.equal(edges.length, 1);
  assert.equal(edges[0].edgeType, "supports");
});
