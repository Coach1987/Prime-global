export type TrustSignalType =
  | "identity_consistency"
  | "conversation_stability"
  | "timeline_consistency"
  | "verified_interaction"
  | "staff_validation"
  | "document_consistency"
  | "unknown_positive_indicator";

export type CircumventionSignalType =
  | "contact_bypass_pattern"
  | "obfuscated_contact_pattern"
  | "cross_channel_evasion"
  | "repeated_policy_boundary_push"
  | "external_redirect_chain"
  | "unknown_circumvention_pattern";

export type SignalSeverity = "low" | "medium" | "high" | "very_high";

export interface ExplainableEvidenceReference {
  evidenceId: string;
  evidenceHash: string;
  sourceType: "message" | "profile" | "job_ad" | "metadata" | "staff_note" | "system_trace";
  sourceReference: string;
  rationale: string;
  createdAt: string;
}

export interface TrustSignal {
  signalId: string;
  signalType: TrustSignalType;
  confidence: number;
  severity: SignalSeverity;
  explanation: string;
  evidenceReferences: ExplainableEvidenceReference[];
  createdAt: string;
}

export interface CircumventionSignal {
  signalId: string;
  signalType: CircumventionSignalType;
  confidence: number;
  severity: SignalSeverity;
  explanation: string;
  evidenceReferences: ExplainableEvidenceReference[];
  reviewRecommended: boolean;
  createdAt: string;
}

export interface ProgressiveConfidenceScoreStep {
  stepId: string;
  contribution: number;
  reason: string;
  evidenceReferenceIds: string[];
}

export interface ProgressiveConfidenceScore {
  score: number;
  normalizedScore: number;
  level: "low" | "medium" | "high" | "very_high";
  steps: ProgressiveConfidenceScoreStep[];
  explainableSummary: string;
}

export interface TrustEvaluationInput {
  organizationId: string;
  tenantId: string | null;
  candidateId: string;
  conversationId: string;
  trustSignals: TrustSignal[];
  circumventionSignals: CircumventionSignal[];
  policyVersion: string;
}

export interface RiskAggregateResult {
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "very_high";
  trustScore: ProgressiveConfidenceScore;
  circumventionScore: ProgressiveConfidenceScore;
  blockedActions: string[];
  evidenceReferences: ExplainableEvidenceReference[];
  explainableSummary: string;
  recommendedHumanReview: boolean;
}

export interface CandidateFriendlyRecommendation {
  recommendationId: string;
  title: string;
  explanation: string;
  nextSteps: string[];
  continuationAllowed: boolean;
  humanReviewAvailable: boolean;
  evidenceReferenceIds: string[];
}

export interface CandidateFriendlyRecommendationResult {
  recommendations: CandidateFriendlyRecommendation[];
  candidateMessage: string;
  continuationStatus: "continue_normally" | "continue_with_review";
}

export interface HumanReviewDecision {
  decisionId: string;
  reviewerId: string;
  outcome: "allow_continue" | "allow_continue_with_monitoring" | "manual_restriction";
  reviewerExplanation: string;
  overrideApplied: boolean;
  createdAt: string;
}

export interface HumanReviewPacket {
  packetId: string;
  organizationId: string;
  candidateId: string;
  conversationId: string;
  riskAggregate: RiskAggregateResult;
  trustSignals: TrustSignal[];
  circumventionSignals: CircumventionSignal[];
  evidenceReferences: ExplainableEvidenceReference[];
  aiSuggestion: "continue_normally" | "continue_with_review";
  overrideRequired: boolean;
  createdAt: string;
}

export interface TrustNode {
  nodeId: string;
  nodeType: "candidate" | "conversation" | "organization" | "signal" | "evidence";
  nodeReference: string;
}

export interface TrustEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: "supports" | "indicates" | "related_to" | "reviewed_by";
  weight: number;
}

export interface TrustGraphRepository {
  upsertNode(node: TrustNode): Promise<void>;
  upsertEdge(edge: TrustEdge): Promise<void>;
  listNodeEdges(nodeId: string): Promise<TrustEdge[]>;
  getNode(nodeId: string): Promise<TrustNode | null>;
}

export interface RiskAggregationEngine {
  aggregate(input: TrustEvaluationInput): RiskAggregateResult;
}

export interface TrustIntelligenceFeatureFlags {
  TRUST_INTELLIGENCE_FOUNDATION_ENABLED: boolean;
  TRUST_SIGNAL_MODEL_ENABLED: boolean;
  CIRCUMVENTION_SIGNAL_MODEL_ENABLED: boolean;
  PROGRESSIVE_CONFIDENCE_SCORING_ENABLED: boolean;
  TRUST_EVIDENCE_EXPLAINABILITY_ENABLED: boolean;
  TRUST_GRAPH_FOUNDATION_ENABLED: boolean;
  CANDIDATE_RECOMMENDATION_ENGINE_ENABLED: boolean;
  RISK_AGGREGATION_ENABLED: boolean;
  HUMAN_REVIEW_OVERRIDE_ENABLED: boolean;
}
