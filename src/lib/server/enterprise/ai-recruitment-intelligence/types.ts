export type CandidateDocumentType =
  | "cv_resume"
  | "diploma"
  | "certificate"
  | "training_certificate"
  | "language_certificate"
  | "identity_document"
  | "portfolio"
  | "future";

export type CandidateReviewStatus = "pending_review" | "approved_by_staff" | "rejected_by_staff" | "needs_manual_review";
export type CandidateAdvisoryRecommendation = "advisory_fit" | "advisory_partial_fit" | "advisory_low_confidence" | "advisory_needs_manual_review";

export interface ExtractionEvidence {
  confidence_score: number;
  extraction_source: string;
  document_reference: string;
  ai_model_used: string;
  extraction_timestamp: string;
}

export interface CandidateDocumentAnalysisRecord {
  id: string;
  candidate_id: string;
  document_type: CandidateDocumentType;
  storage_path: string;
  document_hash: string;
  locale: string;
  analysis_summary: string;
  extracted_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateProfessionalProfileRecord {
  id: string;
  candidate_id: string;
  headline: string | null;
  summary: string;
  locale: string;
  source_document_analysis_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SkillTaxonomyRecord {
  id: string;
  canonical_code: string;
  canonical_name: string;
  category: string;
  locale: string;
  normalized_key: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkillAliasRecord {
  id: string;
  taxonomy_id: string;
  alias_text: string;
  locale: string;
  normalized_key: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CandidateSkillExtractionRecord extends ExtractionEvidence {
  id: string;
  profile_id: string;
  candidate_id: string;
  raw_skill: string;
  normalized_taxonomy_id: string | null;
  normalized_skill_name: string;
  proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateExperienceExtractionRecord extends ExtractionEvidence {
  id: string;
  profile_id: string;
  candidate_id: string;
  role_title: string;
  organization_name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateEducationExtractionRecord extends ExtractionEvidence {
  id: string;
  profile_id: string;
  candidate_id: string;
  institution_name: string;
  degree_title: string;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  grade: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateCertificationExtractionRecord extends ExtractionEvidence {
  id: string;
  profile_id: string;
  candidate_id: string;
  certification_name: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateLanguageExtractionRecord extends ExtractionEvidence {
  id: string;
  profile_id: string;
  candidate_id: string;
  language_name: string;
  normalized_code: string | null;
  proficiency_level: "basic" | "conversational" | "professional" | "native";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateTimelineEntryRecord {
  id: string;
  profile_id: string;
  candidate_id: string;
  entry_type: "experience" | "education" | "certification" | "language" | "skill" | "milestone";
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateConfidenceScoreRecord {
  id: string;
  profile_id: string;
  candidate_id: string;
  overall_confidence: number;
  skills_confidence: number;
  experience_confidence: number;
  education_confidence: number;
  certification_confidence: number;
  language_confidence: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateReviewStatusRecord {
  id: string;
  profile_id: string;
  candidate_id: string;
  status: CandidateReviewStatus;
  reviewer_staff_id: string | null;
  review_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CandidateAiRecommendationRecord {
  id: string;
  profile_id: string;
  candidate_id: string;
  recommendation: CandidateAdvisoryRecommendation;
  recommendation_summary: string;
  advisory_only: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SkillNormalizationResult {
  rawSkill: string;
  normalizedKey: string;
  matchedTaxonomyId: string | null;
  normalizedSkillName: string;
}

export interface CandidateTimelineBuildInput {
  entryType: CandidateTimelineEntryRecord["entry_type"];
  title: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CandidateTimelineBuildResult {
  entryType: CandidateTimelineEntryRecord["entry_type"];
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  metadata: Record<string, unknown>;
}

export interface AdvisoryReviewDecision {
  recommendation: CandidateAdvisoryRecommendation;
  reviewStatus: CandidateReviewStatus;
  reason: string;
}

export interface CandidateCanonicalProfileRecord {
  id: string;
  candidate_id: string;
  source_profile_id: string;
  locale: string;
  source_document_analysis_ids: string[];
  canonical_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CandidateCanonicalFieldStatus = "verified" | "conflict" | "low_confidence" | "missing";

export interface CandidateCanonicalProfileFieldRecord {
  id: string;
  canonical_profile_id: string;
  candidate_id: string;
  field_path: string;
  canonical_value: unknown;
  field_status: CandidateCanonicalFieldStatus;
  confidence_score: number;
  evidence: Array<Record<string, unknown>>;
  source_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type CandidateConflictStatus = "needs_staff_review" | "in_review" | "resolved_by_staff" | "dismissed_by_staff";

export interface CandidateConflictRecord {
  id: string;
  canonical_profile_id: string;
  candidate_id: string;
  field_path: string;
  conflict_kind: "value_mismatch" | "source_disagreement" | "low_confidence";
  conflict_payload: Record<string, unknown>;
  status: CandidateConflictStatus;
  reviewer_staff_id: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface CandidateReviewItemRecord {
  id: string;
  canonical_profile_id: string;
  candidate_id: string;
  item_type: "conflict" | "low_confidence" | "missing_information";
  severity: "high" | "medium" | "low";
  field_path: string | null;
  reason_code: string;
  payload: Record<string, unknown>;
  status: "needs_staff_review" | "in_review" | "resolved";
  reviewer_staff_id: string | null;
  review_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CandidateCanonicalTimelineEntryRecord {
  id: string;
  canonical_profile_id: string;
  candidate_id: string;
  entry_type: CandidateTimelineEntryRecord["entry_type"];
  title: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  verified: boolean;
  source_evidence: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateKnowledgeGraphNodeRecord {
  id: string;
  canonical_profile_id: string;
  candidate_id: string;
  node_type: "skill" | "experience" | "education" | "certificate" | "language" | "project" | "employer" | "country";
  node_key: string;
  node_label: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateKnowledgeGraphEdgeRecord {
  id: string;
  canonical_profile_id: string;
  candidate_id: string;
  from_node_id: string;
  to_node_id: string;
  relation_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CandidateEventRouting {
  eventTypeId: string;
  categoryId: string;
  channelId: string;
  publisherId: string;
  queueId: string;
}

export type SmartJobMatchReviewStatus = "pending_review" | "approved_by_staff" | "rejected_by_staff" | "needs_manual_review";
export type SmartJobMatchCategory = "excellent_match" | "strong_match" | "good_match" | "possible_match" | "weak_match" | "no_match";

export interface SmartJobMatchingRecord {
  id: string;
  candidate_id: string;
  canonical_profile_id: string;
  job_id: string;
  job_payload: Record<string, unknown>;
  overall_match_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  certification_score: number;
  language_score: number;
  location_score: number;
  availability_score: number;
  confidence_score: number;
  match_category: SmartJobMatchCategory;
  score_explanations: Record<string, unknown>;
  why_candidate_matches: string[];
  missing_skills: string[];
  missing_experience: string[];
  strengths: string[];
  weaknesses: string[];
  recommended_improvements: string[];
  evidence: Array<Record<string, unknown>>;
  source_fields: string[];
  ai_model_used: string;
  matching_timestamp: string;
  review_status: SmartJobMatchReviewStatus;
  reviewer_staff_id: string | null;
  review_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SmartJobMatchingReviewRecord {
  id: string;
  match_id: string;
  candidate_id: string;
  canonical_profile_id: string;
  job_id: string;
  status: SmartJobMatchReviewStatus;
  reviewer_staff_id: string | null;
  review_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
