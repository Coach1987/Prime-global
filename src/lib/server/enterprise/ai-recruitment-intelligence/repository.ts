import {
  consumeEventForAiPlatform,
  createAiRequest,
  executeAiTaskFoundation,
  publishAiPlatformEvent,
} from "../ai-platform/index";
import { createSupabaseAdminClient } from "../../supabase.ts";
import { consolidateCandidateProfile } from "./canonicalization.ts";
import { normalizeSkill } from "./normalization.ts";
import { evaluateAdvisoryRecommendation } from "./review.ts";
import { buildSmartJobMatch } from "./smart-matching.ts";
import { buildCandidateTimeline } from "./timeline.ts";
import type {
  CandidateAiRecommendationRecord,
  CandidateCanonicalProfileFieldRecord,
  CandidateCanonicalProfileRecord,
  CandidateCanonicalTimelineEntryRecord,
  CandidateCertificationExtractionRecord,
  CandidateConflictRecord,
  CandidateConflictStatus,
  CandidateConfidenceScoreRecord,
  CandidateDocumentAnalysisRecord,
  CandidateEducationExtractionRecord,
  CandidateExperienceExtractionRecord,
  CandidateEventRouting,
  CandidateKnowledgeGraphEdgeRecord,
  CandidateKnowledgeGraphNodeRecord,
  CandidateLanguageExtractionRecord,
  CandidateProfessionalProfileRecord,
  CandidateReviewItemRecord,
  CandidateReviewStatusRecord,
  CandidateSkillExtractionRecord,
  CandidateTimelineEntryRecord,
  SmartJobMatchingRecord,
  SmartJobMatchingReviewRecord,
  SkillAliasRecord,
  SkillTaxonomyRecord,
} from "./types.ts";

async function listRows<T>(table: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as T[];
}

async function createRow<T>(table: string, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw error;
  return data as T;
}

async function updateRow<T>(table: string, filter: Record<string, unknown>, payload: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from(table).update(payload).select("*");
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.single();
  if (error) throw error;
  return data as T;
}

async function notifyCandidate(candidateId: string, title: string, body: string, entityType: string, entityId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("auth_user_id")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate?.auth_user_id) return;

  await supabase.from("notification_events").insert({
    auth_user_id: candidate.auth_user_id,
    category: "status_change",
    title,
    body,
    entity_type: entityType,
    entity_id: entityId,
    delivery_channels: ["dashboard", "realtime"],
  });
}

export async function listCandidateDocumentAnalyses() {
  return listRows<CandidateDocumentAnalysisRecord>("pgems_ai_candidate_document_analyses");
}

export async function createCandidateDocumentAnalysis(payload: {
  candidateId: string;
  documentType: CandidateDocumentAnalysisRecord["document_type"];
  storagePath: string;
  documentHash: string;
  locale: string;
  analysisSummary: string;
  extractedPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateDocumentAnalysisRecord>("pgems_ai_candidate_document_analyses", {
    candidate_id: payload.candidateId,
    document_type: payload.documentType,
    storage_path: payload.storagePath,
    document_hash: payload.documentHash,
    locale: payload.locale,
    analysis_summary: payload.analysisSummary,
    extracted_payload: payload.extractedPayload,
    metadata: payload.metadata,
  });
}

export async function listCandidateProfessionalProfiles() {
  return listRows<CandidateProfessionalProfileRecord>("pgems_ai_candidate_professional_profiles");
}

export async function createCandidateProfessionalProfile(payload: {
  candidateId: string;
  headline?: string;
  summary: string;
  locale: string;
  sourceDocumentAnalysisIds: string[];
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateProfessionalProfileRecord>("pgems_ai_candidate_professional_profiles", {
    candidate_id: payload.candidateId,
    headline: payload.headline ?? null,
    summary: payload.summary,
    locale: payload.locale,
    source_document_analysis_ids: payload.sourceDocumentAnalysisIds,
    metadata: payload.metadata,
  });
}

export async function listCandidateCanonicalProfiles() {
  return listRows<CandidateCanonicalProfileRecord>("pgems_ai_candidate_canonical_profiles");
}

export async function createCandidateCanonicalProfile(payload: {
  candidateId: string;
  sourceProfileId: string;
  locale: string;
  sourceDocumentAnalysisIds: string[];
  canonicalPayload: Record<string, unknown>;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateCanonicalProfileRecord>("pgems_ai_candidate_canonical_profiles", {
    candidate_id: payload.candidateId,
    source_profile_id: payload.sourceProfileId,
    locale: payload.locale,
    source_document_analysis_ids: payload.sourceDocumentAnalysisIds,
    canonical_payload: payload.canonicalPayload,
    metadata: payload.metadata,
  });
}

export async function listCandidateCanonicalProfileFields() {
  return listRows<CandidateCanonicalProfileFieldRecord>("pgems_ai_candidate_canonical_profile_fields");
}

export async function createCandidateCanonicalProfileField(payload: {
  canonicalProfileId: string;
  candidateId: string;
  fieldPath: string;
  canonicalValue: unknown;
  fieldStatus: CandidateCanonicalProfileFieldRecord["field_status"];
  confidenceScore: number;
  evidence: Array<Record<string, unknown>>;
  sourceCount: number;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateCanonicalProfileFieldRecord>("pgems_ai_candidate_canonical_profile_fields", {
    canonical_profile_id: payload.canonicalProfileId,
    candidate_id: payload.candidateId,
    field_path: payload.fieldPath,
    canonical_value: payload.canonicalValue,
    field_status: payload.fieldStatus,
    confidence_score: payload.confidenceScore,
    evidence: payload.evidence,
    source_count: payload.sourceCount,
    metadata: payload.metadata,
  });
}

export async function listCandidateConflicts() {
  return listRows<CandidateConflictRecord>("pgems_ai_candidate_conflicts");
}

export async function createCandidateConflict(payload: {
  canonicalProfileId: string;
  candidateId: string;
  fieldPath: string;
  conflictKind: CandidateConflictRecord["conflict_kind"];
  conflictPayload: Record<string, unknown>;
  status: CandidateConflictRecord["status"];
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateConflictRecord>("pgems_ai_candidate_conflicts", {
    canonical_profile_id: payload.canonicalProfileId,
    candidate_id: payload.candidateId,
    field_path: payload.fieldPath,
    conflict_kind: payload.conflictKind,
    conflict_payload: payload.conflictPayload,
    status: payload.status,
    metadata: payload.metadata,
  });
}

export async function listCandidateReviewItems() {
  return listRows<CandidateReviewItemRecord>("pgems_ai_candidate_review_items");
}

export async function createCandidateReviewItem(payload: {
  canonicalProfileId: string;
  candidateId: string;
  itemType: CandidateReviewItemRecord["item_type"];
  severity: CandidateReviewItemRecord["severity"];
  fieldPath?: string;
  reasonCode: string;
  payload: Record<string, unknown>;
  status: CandidateReviewItemRecord["status"];
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateReviewItemRecord>("pgems_ai_candidate_review_items", {
    canonical_profile_id: payload.canonicalProfileId,
    candidate_id: payload.candidateId,
    item_type: payload.itemType,
    severity: payload.severity,
    field_path: payload.fieldPath ?? null,
    reason_code: payload.reasonCode,
    payload: payload.payload,
    status: payload.status,
    metadata: payload.metadata,
  });
}

export async function listCandidateCanonicalTimelineEntries() {
  return listRows<CandidateCanonicalTimelineEntryRecord>("pgems_ai_candidate_canonical_timeline_entries");
}

export async function createCandidateCanonicalTimelineEntry(payload: {
  canonicalProfileId: string;
  candidateId: string;
  entryType: CandidateCanonicalTimelineEntryRecord["entry_type"];
  title: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  verified: boolean;
  sourceEvidence: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateCanonicalTimelineEntryRecord>("pgems_ai_candidate_canonical_timeline_entries", {
    canonical_profile_id: payload.canonicalProfileId,
    candidate_id: payload.candidateId,
    entry_type: payload.entryType,
    title: payload.title,
    description: payload.description,
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    verified: payload.verified,
    source_evidence: payload.sourceEvidence,
    metadata: payload.metadata,
  });
}

export async function listCandidateKnowledgeGraphNodes() {
  return listRows<CandidateKnowledgeGraphNodeRecord>("pgems_ai_candidate_knowledge_graph_nodes");
}

export async function createCandidateKnowledgeGraphNode(payload: {
  canonicalProfileId: string;
  candidateId: string;
  nodeType: CandidateKnowledgeGraphNodeRecord["node_type"];
  nodeKey: string;
  nodeLabel: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateKnowledgeGraphNodeRecord>("pgems_ai_candidate_knowledge_graph_nodes", {
    canonical_profile_id: payload.canonicalProfileId,
    candidate_id: payload.candidateId,
    node_type: payload.nodeType,
    node_key: payload.nodeKey,
    node_label: payload.nodeLabel,
    metadata: payload.metadata,
  });
}

export async function listCandidateKnowledgeGraphEdges() {
  return listRows<CandidateKnowledgeGraphEdgeRecord>("pgems_ai_candidate_knowledge_graph_edges");
}

export async function createCandidateKnowledgeGraphEdge(payload: {
  canonicalProfileId: string;
  candidateId: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateKnowledgeGraphEdgeRecord>("pgems_ai_candidate_knowledge_graph_edges", {
    canonical_profile_id: payload.canonicalProfileId,
    candidate_id: payload.candidateId,
    from_node_id: payload.fromNodeId,
    to_node_id: payload.toNodeId,
    relation_type: payload.relationType,
    metadata: payload.metadata,
  });
}

export async function listSkillTaxonomy() {
  return listRows<SkillTaxonomyRecord>("pgems_ai_candidate_skill_taxonomy");
}

export async function createSkillTaxonomyEntry(payload: {
  canonicalCode: string;
  canonicalName: string;
  category: string;
  locale: string;
  normalizedKey: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<SkillTaxonomyRecord>("pgems_ai_candidate_skill_taxonomy", {
    canonical_code: payload.canonicalCode,
    canonical_name: payload.canonicalName,
    category: payload.category,
    locale: payload.locale,
    normalized_key: payload.normalizedKey,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listSkillAliases() {
  return listRows<SkillAliasRecord>("pgems_ai_candidate_skill_aliases");
}

export async function createSkillAlias(payload: {
  taxonomyId: string;
  aliasText: string;
  locale: string;
  normalizedKey: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}) {
  return createRow<SkillAliasRecord>("pgems_ai_candidate_skill_aliases", {
    taxonomy_id: payload.taxonomyId,
    alias_text: payload.aliasText,
    locale: payload.locale,
    normalized_key: payload.normalizedKey,
    metadata: payload.metadata,
    is_active: payload.isActive,
  });
}

export async function listCandidateSkillExtractions() {
  return listRows<CandidateSkillExtractionRecord>("pgems_ai_candidate_skill_extractions");
}

export async function createCandidateSkillExtraction(payload: {
  profileId: string;
  candidateId: string;
  rawSkill: string;
  normalizedTaxonomyId?: string;
  normalizedSkillName: string;
  proficiencyLevel: CandidateSkillExtractionRecord["proficiency_level"];
  confidenceScore: number;
  extractionSource: string;
  documentReference: string;
  aiModelUsed: string;
  extractionTimestamp: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateSkillExtractionRecord>("pgems_ai_candidate_skill_extractions", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    raw_skill: payload.rawSkill,
    normalized_taxonomy_id: payload.normalizedTaxonomyId ?? null,
    normalized_skill_name: payload.normalizedSkillName,
    proficiency_level: payload.proficiencyLevel,
    confidence_score: payload.confidenceScore,
    extraction_source: payload.extractionSource,
    document_reference: payload.documentReference,
    ai_model_used: payload.aiModelUsed,
    extraction_timestamp: payload.extractionTimestamp,
    metadata: payload.metadata,
  });
}

export async function listCandidateExperienceExtractions() {
  return listRows<CandidateExperienceExtractionRecord>("pgems_ai_candidate_experience_extractions");
}

export async function createCandidateExperienceExtraction(payload: {
  profileId: string;
  candidateId: string;
  roleTitle: string;
  organizationName: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  confidenceScore: number;
  extractionSource: string;
  documentReference: string;
  aiModelUsed: string;
  extractionTimestamp: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateExperienceExtractionRecord>("pgems_ai_candidate_experience_extractions", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    role_title: payload.roleTitle,
    organization_name: payload.organizationName,
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    is_current: payload.isCurrent,
    description: payload.description,
    confidence_score: payload.confidenceScore,
    extraction_source: payload.extractionSource,
    document_reference: payload.documentReference,
    ai_model_used: payload.aiModelUsed,
    extraction_timestamp: payload.extractionTimestamp,
    metadata: payload.metadata,
  });
}

export async function listCandidateEducationExtractions() {
  return listRows<CandidateEducationExtractionRecord>("pgems_ai_candidate_education_extractions");
}

export async function createCandidateEducationExtraction(payload: {
  profileId: string;
  candidateId: string;
  institutionName: string;
  degreeTitle: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  confidenceScore: number;
  extractionSource: string;
  documentReference: string;
  aiModelUsed: string;
  extractionTimestamp: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateEducationExtractionRecord>("pgems_ai_candidate_education_extractions", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    institution_name: payload.institutionName,
    degree_title: payload.degreeTitle,
    field_of_study: payload.fieldOfStudy ?? null,
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    grade: payload.grade ?? null,
    confidence_score: payload.confidenceScore,
    extraction_source: payload.extractionSource,
    document_reference: payload.documentReference,
    ai_model_used: payload.aiModelUsed,
    extraction_timestamp: payload.extractionTimestamp,
    metadata: payload.metadata,
  });
}

export async function listCandidateCertificationExtractions() {
  return listRows<CandidateCertificationExtractionRecord>("pgems_ai_candidate_certification_extractions");
}

export async function createCandidateCertificationExtraction(payload: {
  profileId: string;
  candidateId: string;
  certificationName: string;
  issuingOrganization?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  confidenceScore: number;
  extractionSource: string;
  documentReference: string;
  aiModelUsed: string;
  extractionTimestamp: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateCertificationExtractionRecord>("pgems_ai_candidate_certification_extractions", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    certification_name: payload.certificationName,
    issuing_organization: payload.issuingOrganization ?? null,
    issue_date: payload.issueDate ?? null,
    expiry_date: payload.expiryDate ?? null,
    credential_id: payload.credentialId ?? null,
    confidence_score: payload.confidenceScore,
    extraction_source: payload.extractionSource,
    document_reference: payload.documentReference,
    ai_model_used: payload.aiModelUsed,
    extraction_timestamp: payload.extractionTimestamp,
    metadata: payload.metadata,
  });
}

export async function listCandidateLanguageExtractions() {
  return listRows<CandidateLanguageExtractionRecord>("pgems_ai_candidate_language_extractions");
}

export async function createCandidateLanguageExtraction(payload: {
  profileId: string;
  candidateId: string;
  languageName: string;
  normalizedCode?: string;
  proficiencyLevel: CandidateLanguageExtractionRecord["proficiency_level"];
  confidenceScore: number;
  extractionSource: string;
  documentReference: string;
  aiModelUsed: string;
  extractionTimestamp: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateLanguageExtractionRecord>("pgems_ai_candidate_language_extractions", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    language_name: payload.languageName,
    normalized_code: payload.normalizedCode ?? null,
    proficiency_level: payload.proficiencyLevel,
    confidence_score: payload.confidenceScore,
    extraction_source: payload.extractionSource,
    document_reference: payload.documentReference,
    ai_model_used: payload.aiModelUsed,
    extraction_timestamp: payload.extractionTimestamp,
    metadata: payload.metadata,
  });
}

export async function listCandidateTimelineEntries() {
  return listRows<CandidateTimelineEntryRecord>("pgems_ai_candidate_timeline_entries");
}

export async function createCandidateTimelineEntry(payload: {
  profileId: string;
  candidateId: string;
  entryType: CandidateTimelineEntryRecord["entry_type"];
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateTimelineEntryRecord>("pgems_ai_candidate_timeline_entries", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    entry_type: payload.entryType,
    title: payload.title,
    description: payload.description,
    start_date: payload.startDate ?? null,
    end_date: payload.endDate ?? null,
    metadata: payload.metadata,
  });
}

export async function listCandidateConfidenceScores() {
  return listRows<CandidateConfidenceScoreRecord>("pgems_ai_candidate_confidence_scores");
}

export async function createCandidateConfidenceScore(payload: {
  profileId: string;
  candidateId: string;
  overallConfidence: number;
  skillsConfidence: number;
  experienceConfidence: number;
  educationConfidence: number;
  certificationConfidence: number;
  languageConfidence: number;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateConfidenceScoreRecord>("pgems_ai_candidate_confidence_scores", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    overall_confidence: payload.overallConfidence,
    skills_confidence: payload.skillsConfidence,
    experience_confidence: payload.experienceConfidence,
    education_confidence: payload.educationConfidence,
    certification_confidence: payload.certificationConfidence,
    language_confidence: payload.languageConfidence,
    metadata: payload.metadata,
  });
}

export async function listCandidateReviewStatuses() {
  return listRows<CandidateReviewStatusRecord>("pgems_ai_candidate_review_statuses");
}

export async function createCandidateReviewStatus(payload: {
  profileId: string;
  candidateId: string;
  status: CandidateReviewStatusRecord["status"];
  reviewerStaffId?: string;
  reviewNotes?: string;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateReviewStatusRecord>("pgems_ai_candidate_review_statuses", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    status: payload.status,
    reviewer_staff_id: payload.reviewerStaffId ?? null,
    review_notes: payload.reviewNotes ?? null,
    metadata: payload.metadata,
  });
}

export async function listCandidateAiRecommendations() {
  return listRows<CandidateAiRecommendationRecord>("pgems_ai_candidate_recommendations");
}

export async function createCandidateAiRecommendation(payload: {
  profileId: string;
  candidateId: string;
  recommendation: CandidateAiRecommendationRecord["recommendation"];
  recommendationSummary: string;
  advisoryOnly: boolean;
  metadata: Record<string, unknown>;
}) {
  return createRow<CandidateAiRecommendationRecord>("pgems_ai_candidate_recommendations", {
    profile_id: payload.profileId,
    candidate_id: payload.candidateId,
    recommendation: payload.recommendation,
    recommendation_summary: payload.recommendationSummary,
    advisory_only: payload.advisoryOnly,
    metadata: payload.metadata,
  });
}

export async function listSmartJobMatches() {
  return listRows<SmartJobMatchingRecord>("pgems_ai_smart_job_matches");
}

export async function listSmartJobMatchReviews() {
  return listRows<SmartJobMatchingReviewRecord>("pgems_ai_smart_job_match_reviews");
}

export async function createSmartJobMatch(payload: {
  candidateId: string;
  canonicalProfileId: string;
  aiTaskId: string;
  aiPromptVersionId?: string;
  locale: string;
  inputPayload: Record<string, unknown>;
  aiModelUsed: string;
  jobProfile: {
    jobId: string;
    title: string;
    requiredSkills: string[];
    preferredSkills: string[];
    minimumYearsExperience?: number;
    requiredEducationLevels: string[];
    requiredCertifications: string[];
    requiredLanguages: string[];
    country?: string;
    region?: string;
    workAuthorizationRequired?: boolean;
    employmentType?: string;
    industry?: string;
    specialization?: string;
    availability?: string;
    careerLevel?: string;
    jobFunction?: string;
  };
  candidateContext: {
    yearsExperience?: number;
    educationLevels?: string[];
    certifications?: string[];
    languages?: string[];
    country?: string;
    region?: string;
    workAuthorization?: boolean;
    employmentType?: string;
    industry?: string;
    specialization?: string;
    availability?: string;
    careerLevel?: string;
    jobFunction?: string;
  };
  eventRouting: CandidateEventRouting;
  metadata: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: canonical, error: canonicalError } = await supabase
    .from("pgems_ai_candidate_canonical_profiles")
    .select("*")
    .eq("id", payload.canonicalProfileId)
    .single();

  if (canonicalError) throw canonicalError;
  if (!canonical || canonical.candidate_id !== payload.candidateId) {
    throw new Error("Canonical profile does not belong to candidate");
  }

  const aiRequest = await createAiRequest({
    taskId: payload.aiTaskId,
    promptVersionId: payload.aiPromptVersionId,
    correlationId: `candidate:${payload.candidateId}:job:${payload.jobProfile.jobId}:matching`,
    traceId: `candidate:${payload.candidateId}:job:${payload.jobProfile.jobId}:matching:${Date.now()}`,
    inputPayload: payload.inputPayload,
    inputHash: `${payload.candidateId}:${payload.canonicalProfileId}:${payload.jobProfile.jobId}`,
    locale: payload.locale,
    status: "created",
    priority: "normal",
    metadata: payload.metadata,
  });

  const aiExecution = await executeAiTaskFoundation({
    taskId: payload.aiTaskId,
    requestId: aiRequest.id,
    dryRun: false,
  });

  const matchResult = buildSmartJobMatch({
    canonicalProfile: canonical,
    candidateContext: payload.candidateContext,
    jobProfile: payload.jobProfile,
  });

  const matchingTimestamp = new Date().toISOString();
  const reviewStatus = matchResult.scorecard.confidenceScore < 55 || matchResult.matchCategory === "weak_match" || matchResult.matchCategory === "no_match"
    ? "needs_manual_review"
    : "pending_review";

  const match = await createRow<SmartJobMatchingRecord>("pgems_ai_smart_job_matches", {
    candidate_id: payload.candidateId,
    canonical_profile_id: payload.canonicalProfileId,
    job_id: payload.jobProfile.jobId,
    job_payload: payload.jobProfile,
    overall_match_score: matchResult.scorecard.overallMatchScore,
    skills_score: matchResult.scorecard.skillsScore,
    experience_score: matchResult.scorecard.experienceScore,
    education_score: matchResult.scorecard.educationScore,
    certification_score: matchResult.scorecard.certificationScore,
    language_score: matchResult.scorecard.languageScore,
    location_score: matchResult.scorecard.locationScore,
    availability_score: matchResult.scorecard.availabilityScore,
    confidence_score: matchResult.scorecard.confidenceScore,
    match_category: matchResult.matchCategory,
    score_explanations: matchResult.scorecard.explanations,
    why_candidate_matches: matchResult.whyCandidateMatches,
    missing_skills: matchResult.missingSkills,
    missing_experience: matchResult.missingExperience,
    strengths: matchResult.strengths,
    weaknesses: matchResult.weaknesses,
    recommended_improvements: matchResult.recommendedImprovements,
    evidence: matchResult.evidence,
    source_fields: matchResult.sourceFields,
    ai_model_used: payload.aiModelUsed,
    matching_timestamp: matchingTimestamp,
    review_status: reviewStatus,
    reviewer_staff_id: null,
    review_notes: "AI recommendation is advisory only; Prime Global staff must review.",
    metadata: {
      aiRequestId: aiRequest.id,
      aiExecution,
      ...payload.metadata,
    },
  });

  const review = await createRow<SmartJobMatchingReviewRecord>("pgems_ai_smart_job_match_reviews", {
    match_id: match.id,
    candidate_id: payload.candidateId,
    canonical_profile_id: payload.canonicalProfileId,
    job_id: payload.jobProfile.jobId,
    status: reviewStatus,
    reviewer_staff_id: null,
    review_notes: "Initial review status generated by advisory matching engine.",
    metadata: {},
  });

  const publishedEvents = await Promise.all([
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: canonical.source_profile_id,
      eventName: "CandidateMatched",
      idempotencySuffix: match.id,
      metadata: {},
      body: {
        matchId: match.id,
        jobId: payload.jobProfile.jobId,
        overallMatchScore: match.overall_match_score,
        matchCategory: match.match_category,
      },
    }),
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: canonical.source_profile_id,
      eventName: "JobMatched",
      idempotencySuffix: `${payload.jobProfile.jobId}:${match.id}`,
      metadata: {},
      body: {
        matchId: match.id,
        jobId: payload.jobProfile.jobId,
        overallMatchScore: match.overall_match_score,
        matchCategory: match.match_category,
      },
    }),
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: canonical.source_profile_id,
      eventName: "MatchingCompleted",
      idempotencySuffix: `${match.id}:completed`,
      metadata: {},
      body: {
        matchId: match.id,
        jobId: payload.jobProfile.jobId,
        reviewStatus: review.status,
      },
    }),
  ]);

  return {
    aiRequest,
    aiExecution,
    match,
    review,
    publishedEvents,
  };
}

export async function updateSmartJobMatchReview(payload: {
  matchId: string;
  status: SmartJobMatchingRecord["review_status"];
  reviewerStaffId?: string;
  reviewNotes?: string;
  eventRouting?: CandidateEventRouting;
  metadata: Record<string, unknown>;
}) {
  const updated = await updateRow<SmartJobMatchingRecord>("pgems_ai_smart_job_matches", { id: payload.matchId }, {
    review_status: payload.status,
    reviewer_staff_id: payload.reviewerStaffId ?? null,
    review_notes: payload.reviewNotes ?? null,
    metadata: payload.metadata,
  });

  const review = await createRow<SmartJobMatchingReviewRecord>("pgems_ai_smart_job_match_reviews", {
    match_id: updated.id,
    candidate_id: updated.candidate_id,
    canonical_profile_id: updated.canonical_profile_id,
    job_id: updated.job_id,
    status: payload.status,
    reviewer_staff_id: payload.reviewerStaffId ?? null,
    review_notes: payload.reviewNotes ?? null,
    metadata: payload.metadata,
  });

  if (payload.status === "approved_by_staff" || payload.status === "rejected_by_staff") {
    await notifyCandidate(
      updated.candidate_id,
      "Matching review completed",
      `A staff review decision was recorded for one of your job matches (${payload.status}).`,
      "smart_job_match_review",
      review.id
    );
  }

  if (payload.eventRouting) {
    const canonical = await createSupabaseAdminClient()
      .from("pgems_ai_candidate_canonical_profiles")
      .select("source_profile_id")
      .eq("id", updated.canonical_profile_id)
      .single();

    await publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: updated.candidate_id,
      profileId: canonical.data?.source_profile_id ?? updated.canonical_profile_id,
      eventName: "MatchingReviewed",
      idempotencySuffix: `${updated.id}:${review.id}`,
      metadata: {},
      body: {
        matchId: updated.id,
        jobId: updated.job_id,
        reviewId: review.id,
        reviewStatus: payload.status,
      },
    });
  }

  return {
    match: updated,
    review,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
}

async function publishCandidateEvent(payload: {
  routing: CandidateEventRouting;
  candidateId: string;
  profileId: string;
  eventName: string;
  idempotencySuffix: string;
  metadata: Record<string, unknown>;
  body?: Record<string, unknown>;
}) {
  return publishAiPlatformEvent({
    eventTypeId: payload.routing.eventTypeId,
    categoryId: payload.routing.categoryId,
    channelId: payload.routing.channelId,
    publisherId: payload.routing.publisherId,
    queueId: payload.routing.queueId,
    kind: "domain",
    priority: "normal",
    status: "queued",
    correlationId: `candidate:${payload.candidateId}:profile`,
    traceId: `candidate:${payload.candidateId}:profile:${Date.now()}`,
    idempotencyKey: `${payload.eventName.toLowerCase()}:${payload.idempotencySuffix}`,
    payload: {
      eventName: payload.eventName,
      candidateId: payload.candidateId,
      profileId: payload.profileId,
      ...(payload.body ?? {}),
    },
    metadata: payload.metadata,
    maxRetryCount: 5,
  });
}

export async function generateCandidateProfileFromDocuments(payload: {
  candidateId: string;
  documentAnalysisIds: string[];
  aiTaskId: string;
  aiPromptVersionId?: string;
  locale: string;
  inputPayload: Record<string, unknown>;
  profileDraft: { headline?: string; summary: string };
  extracted: {
    skills: Array<{
      rawSkill: string;
      normalizedTaxonomyId?: string;
      normalizedSkillName: string;
      proficiencyLevel: CandidateSkillExtractionRecord["proficiency_level"];
      confidenceScore: number;
      extractionSource: string;
      documentReference: string;
      aiModelUsed: string;
      extractionTimestamp: string;
      metadata: Record<string, unknown>;
    }>;
    experiences: Array<{
      roleTitle: string;
      organizationName: string;
      startDate?: string;
      endDate?: string;
      isCurrent: boolean;
      description: string;
      confidenceScore: number;
      extractionSource: string;
      documentReference: string;
      aiModelUsed: string;
      extractionTimestamp: string;
      metadata: Record<string, unknown>;
    }>;
    educations: Array<{
      institutionName: string;
      degreeTitle: string;
      fieldOfStudy?: string;
      startDate?: string;
      endDate?: string;
      grade?: string;
      confidenceScore: number;
      extractionSource: string;
      documentReference: string;
      aiModelUsed: string;
      extractionTimestamp: string;
      metadata: Record<string, unknown>;
    }>;
    certifications: Array<{
      certificationName: string;
      issuingOrganization?: string;
      issueDate?: string;
      expiryDate?: string;
      credentialId?: string;
      confidenceScore: number;
      extractionSource: string;
      documentReference: string;
      aiModelUsed: string;
      extractionTimestamp: string;
      metadata: Record<string, unknown>;
    }>;
    languages: Array<{
      languageName: string;
      normalizedCode?: string;
      proficiencyLevel: CandidateLanguageExtractionRecord["proficiency_level"];
      confidenceScore: number;
      extractionSource: string;
      documentReference: string;
      aiModelUsed: string;
      extractionTimestamp: string;
      metadata: Record<string, unknown>;
    }>;
  };
  eventRouting: {
    eventTypeId: string;
    categoryId: string;
    channelId: string;
    publisherId: string;
    queueId: string;
  };
  metadata: Record<string, unknown>;
}) {
  const taxonomy = await listSkillTaxonomy();
  const aliases = await listSkillAliases();

  const aiRequest = await createAiRequest({
    taskId: payload.aiTaskId,
    promptVersionId: payload.aiPromptVersionId,
    correlationId: `candidate:${payload.candidateId}:profile-generation`,
    traceId: `candidate:${payload.candidateId}:trace:${Date.now()}`,
    inputPayload: payload.inputPayload,
    inputHash: `${payload.candidateId}:${payload.documentAnalysisIds.join(",")}`,
    locale: payload.locale,
    status: "created",
    priority: "normal",
    metadata: {
      candidateId: payload.candidateId,
      documentAnalysisIds: payload.documentAnalysisIds,
      ...payload.metadata,
    },
  });

  const aiExecution = await executeAiTaskFoundation({
    taskId: payload.aiTaskId,
    requestId: aiRequest.id,
    dryRun: false,
  });

  const profile = await createCandidateProfessionalProfile({
    candidateId: payload.candidateId,
    headline: payload.profileDraft.headline,
    summary: payload.profileDraft.summary,
    locale: payload.locale,
    sourceDocumentAnalysisIds: payload.documentAnalysisIds,
    metadata: {
      aiRequestId: aiRequest.id,
      aiExecution,
      ...payload.metadata,
    },
  });

  const normalizedSkills = payload.extracted.skills.map((item) => {
    const normalized = normalizeSkill({
      rawSkill: item.rawSkill,
      taxonomy,
      aliases,
    });

    return {
      ...item,
      normalizedTaxonomyId: item.normalizedTaxonomyId ?? normalized.matchedTaxonomyId ?? undefined,
      normalizedSkillName: normalized.normalizedSkillName,
    };
  });

  const skillRows = await Promise.all(
    normalizedSkills.map((skill) =>
      createCandidateSkillExtraction({
        profileId: profile.id,
        candidateId: payload.candidateId,
        rawSkill: skill.rawSkill,
        normalizedTaxonomyId: skill.normalizedTaxonomyId,
        normalizedSkillName: skill.normalizedSkillName,
        proficiencyLevel: skill.proficiencyLevel,
        confidenceScore: skill.confidenceScore,
        extractionSource: skill.extractionSource,
        documentReference: skill.documentReference,
        aiModelUsed: skill.aiModelUsed,
        extractionTimestamp: skill.extractionTimestamp,
        metadata: skill.metadata,
      })
    )
  );

  const experienceRows = await Promise.all(
    payload.extracted.experiences.map((experience) =>
      createCandidateExperienceExtraction({
        profileId: profile.id,
        candidateId: payload.candidateId,
        roleTitle: experience.roleTitle,
        organizationName: experience.organizationName,
        startDate: experience.startDate,
        endDate: experience.endDate,
        isCurrent: experience.isCurrent,
        description: experience.description,
        confidenceScore: experience.confidenceScore,
        extractionSource: experience.extractionSource,
        documentReference: experience.documentReference,
        aiModelUsed: experience.aiModelUsed,
        extractionTimestamp: experience.extractionTimestamp,
        metadata: experience.metadata,
      })
    )
  );

  const educationRows = await Promise.all(
    payload.extracted.educations.map((education) =>
      createCandidateEducationExtraction({
        profileId: profile.id,
        candidateId: payload.candidateId,
        institutionName: education.institutionName,
        degreeTitle: education.degreeTitle,
        fieldOfStudy: education.fieldOfStudy,
        startDate: education.startDate,
        endDate: education.endDate,
        grade: education.grade,
        confidenceScore: education.confidenceScore,
        extractionSource: education.extractionSource,
        documentReference: education.documentReference,
        aiModelUsed: education.aiModelUsed,
        extractionTimestamp: education.extractionTimestamp,
        metadata: education.metadata,
      })
    )
  );

  const certificationRows = await Promise.all(
    payload.extracted.certifications.map((certification) =>
      createCandidateCertificationExtraction({
        profileId: profile.id,
        candidateId: payload.candidateId,
        certificationName: certification.certificationName,
        issuingOrganization: certification.issuingOrganization,
        issueDate: certification.issueDate,
        expiryDate: certification.expiryDate,
        credentialId: certification.credentialId,
        confidenceScore: certification.confidenceScore,
        extractionSource: certification.extractionSource,
        documentReference: certification.documentReference,
        aiModelUsed: certification.aiModelUsed,
        extractionTimestamp: certification.extractionTimestamp,
        metadata: certification.metadata,
      })
    )
  );

  const languageRows = await Promise.all(
    payload.extracted.languages.map((language) =>
      createCandidateLanguageExtraction({
        profileId: profile.id,
        candidateId: payload.candidateId,
        languageName: language.languageName,
        normalizedCode: language.normalizedCode,
        proficiencyLevel: language.proficiencyLevel,
        confidenceScore: language.confidenceScore,
        extractionSource: language.extractionSource,
        documentReference: language.documentReference,
        aiModelUsed: language.aiModelUsed,
        extractionTimestamp: language.extractionTimestamp,
        metadata: language.metadata,
      })
    )
  );

  const timeline = buildCandidateTimeline([
    ...experienceRows.map((item) => ({
      entryType: "experience" as const,
      title: `${item.role_title} @ ${item.organization_name}`,
      description: item.description,
      startDate: item.start_date,
      endDate: item.end_date,
      metadata: {
        sourceId: item.id,
      },
    })),
    ...educationRows.map((item) => ({
      entryType: "education" as const,
      title: `${item.degree_title} @ ${item.institution_name}`,
      description: item.field_of_study ?? "",
      startDate: item.start_date,
      endDate: item.end_date,
      metadata: {
        sourceId: item.id,
      },
    })),
    ...certificationRows.map((item) => ({
      entryType: "certification" as const,
      title: item.certification_name,
      description: item.issuing_organization ?? "",
      startDate: item.issue_date,
      endDate: item.expiry_date,
      metadata: {
        sourceId: item.id,
      },
    })),
    ...languageRows.map((item) => ({
      entryType: "language" as const,
      title: item.language_name,
      description: item.proficiency_level,
      metadata: {
        sourceId: item.id,
      },
    })),
    ...skillRows.map((item) => ({
      entryType: "skill" as const,
      title: item.normalized_skill_name,
      description: item.proficiency_level,
      metadata: {
        sourceId: item.id,
      },
    })),
  ]);

  const timelineRows = await Promise.all(
    timeline.map((entry) =>
      createCandidateTimelineEntry({
        profileId: profile.id,
        candidateId: payload.candidateId,
        entryType: entry.entryType,
        title: entry.title,
        description: entry.description,
        startDate: entry.startDate ?? undefined,
        endDate: entry.endDate ?? undefined,
        metadata: entry.metadata,
      })
    )
  );

  const canonicalized = consolidateCandidateProfile({
    profileDraft: payload.profileDraft,
    skills: skillRows,
    experiences: experienceRows,
    educations: educationRows,
    certifications: certificationRows,
    languages: languageRows,
  });

  const canonicalProfile = await createCandidateCanonicalProfile({
    candidateId: payload.candidateId,
    sourceProfileId: profile.id,
    locale: payload.locale,
    sourceDocumentAnalysisIds: payload.documentAnalysisIds,
    canonicalPayload: canonicalized.canonicalPayload,
    metadata: {
      aiRequestId: aiRequest.id,
      phase: "phase7_candidate_intelligence_completion",
    },
  });

  const canonicalFields = await Promise.all(
    canonicalized.fields.map((field) =>
      createCandidateCanonicalProfileField({
        canonicalProfileId: canonicalProfile.id,
        candidateId: payload.candidateId,
        fieldPath: field.fieldPath,
        canonicalValue: field.canonicalValue,
        fieldStatus: field.fieldStatus,
        confidenceScore: field.confidenceScore,
        evidence: field.evidence,
        sourceCount: field.sourceCount,
        metadata: field.metadata,
      })
    )
  );

  const conflictRows = await Promise.all(
    canonicalized.conflicts.map((conflict) =>
      createCandidateConflict({
        canonicalProfileId: canonicalProfile.id,
        candidateId: payload.candidateId,
        fieldPath: conflict.fieldPath,
        conflictKind: conflict.conflictKind,
        conflictPayload: conflict.conflictPayload,
        status: conflict.status,
        metadata: conflict.metadata,
      })
    )
  );

  const reviewItems = await Promise.all(
    canonicalized.reviewItems.map((item) =>
      createCandidateReviewItem({
        canonicalProfileId: canonicalProfile.id,
        candidateId: payload.candidateId,
        itemType: item.itemType,
        severity: item.severity,
        fieldPath: item.fieldPath,
        reasonCode: item.reasonCode,
        payload: item.payload,
        status: item.status,
        metadata: item.metadata,
      })
    )
  );

  const canonicalTimelineRows = await Promise.all(
    canonicalized.timeline.map((entry) =>
      createCandidateCanonicalTimelineEntry({
        canonicalProfileId: canonicalProfile.id,
        candidateId: payload.candidateId,
        entryType: entry.entryType,
        title: entry.title,
        description: entry.description,
        startDate: entry.startDate,
        endDate: entry.endDate,
        verified: true,
        sourceEvidence: entry.sourceEvidence,
        metadata: entry.metadata,
      })
    )
  );

  const graphNodeRows = await Promise.all(
    canonicalized.graph.nodes.map((node) =>
      createCandidateKnowledgeGraphNode({
        canonicalProfileId: canonicalProfile.id,
        candidateId: payload.candidateId,
        nodeType: node.nodeType,
        nodeKey: node.nodeKey,
        nodeLabel: node.nodeLabel,
        metadata: node.metadata,
      })
    )
  );

  const nodeByRef = new Map<string, string>();
  for (const node of graphNodeRows) {
    const key = `${node.node_type}:${node.node_key}`;
    nodeByRef.set(key, node.id);
  }

  const graphEdgeRows = await Promise.all(
    canonicalized.graph.edges
      .map((edge) => {
        const fromNodeId = nodeByRef.get(edge.fromNodeKeyRef);
        const toNodeId = nodeByRef.get(edge.toNodeKeyRef);
        if (!fromNodeId || !toNodeId) return null;
        return createCandidateKnowledgeGraphEdge({
          canonicalProfileId: canonicalProfile.id,
          candidateId: payload.candidateId,
          fromNodeId,
          toNodeId,
          relationType: edge.relationType,
          metadata: edge.metadata,
        });
      })
      .filter((value): value is Promise<CandidateKnowledgeGraphEdgeRecord> => value !== null)
  );

  const skillsConfidence = average(skillRows.map((item) => item.confidence_score));
  const experienceConfidence = average(experienceRows.map((item) => item.confidence_score));
  const educationConfidence = average(educationRows.map((item) => item.confidence_score));
  const certificationConfidence = average(certificationRows.map((item) => item.confidence_score));
  const languageConfidence = average(languageRows.map((item) => item.confidence_score));
  const overallConfidence = average([
    skillsConfidence,
    experienceConfidence,
    educationConfidence,
    certificationConfidence,
    languageConfidence,
  ]);

  const confidence = await createCandidateConfidenceScore({
    profileId: profile.id,
    candidateId: payload.candidateId,
    overallConfidence,
    skillsConfidence,
    experienceConfidence,
    educationConfidence,
    certificationConfidence,
    languageConfidence,
    metadata: {
      aiRequestId: aiRequest.id,
    },
  });

  const advisory = evaluateAdvisoryRecommendation({
    overallConfidence,
    needsManualReview: reviewItems.length > 0 || conflictRows.length > 0,
  });

  const review = await createCandidateReviewStatus({
    profileId: profile.id,
    candidateId: payload.candidateId,
    status: advisory.reviewStatus,
    reviewNotes: "AI output is advisory only. Staff review required.",
    metadata: {
      advisoryReason: advisory.reason,
    },
  });

  const recommendation = await createCandidateAiRecommendation({
    profileId: profile.id,
    candidateId: payload.candidateId,
    recommendation: advisory.recommendation,
    recommendationSummary: advisory.reason,
    advisoryOnly: true,
    metadata: {
      overallConfidence,
    },
  });

  const baseEvents = await Promise.all([
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: profile.id,
      eventName: "CandidateProfileCreated",
      idempotencySuffix: profile.id,
      metadata: {},
    }),
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: profile.id,
      eventName: "CandidateExtractionCompleted",
      idempotencySuffix: profile.id,
      metadata: {},
    }),
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: profile.id,
      eventName: "CandidateReviewRequested",
      idempotencySuffix: `${profile.id}:requested`,
      metadata: {},
      body: {
        reviewStatus: review.status,
      },
    }),
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: profile.id,
      eventName: "CandidateProfileUpdated",
      idempotencySuffix: `${profile.id}:updated`,
      metadata: {},
    }),
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: profile.id,
      eventName: "CandidateProfileCanonicalized",
      idempotencySuffix: canonicalProfile.id,
      metadata: {},
      body: {
        canonicalProfileId: canonicalProfile.id,
      },
    }),
    publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: payload.candidateId,
      profileId: profile.id,
      eventName: "CandidateReviewUpdated",
      idempotencySuffix: `${review.id}:${review.updated_at}`,
      metadata: {},
      body: {
        reviewId: review.id,
        reviewStatus: review.status,
      },
    }),
  ]);

  const conflictEvents = await Promise.all(
    conflictRows.map((conflict) =>
      publishCandidateEvent({
        routing: payload.eventRouting,
        candidateId: payload.candidateId,
        profileId: profile.id,
        eventName: "CandidateConflictDetected",
        idempotencySuffix: conflict.id,
        metadata: {},
        body: {
          canonicalProfileId: canonicalProfile.id,
          conflictId: conflict.id,
          fieldPath: conflict.field_path,
          status: conflict.status,
        },
      })
    )
  );

  const publishedEvents = [...baseEvents, ...conflictEvents];

  return {
    aiRequest,
    aiExecution,
    profile,
    skillRows,
    experienceRows,
    educationRows,
    certificationRows,
    languageRows,
    timelineRows,
    canonicalProfile,
    canonicalFields,
    conflictRows,
    reviewItems,
    canonicalTimelineRows,
    graphNodeRows,
    graphEdgeRows,
    confidence,
    review,
    recommendation,
    publishedEvents,
  };
}

export async function consumeRecruitmentIntelligenceEvent(payload: {
  eventId: string;
  metadata: Record<string, unknown>;
}) {
  const consumed = await consumeEventForAiPlatform({
    eventId: payload.eventId,
    metadata: payload.metadata,
  });

  return consumed;
}

export async function updateCandidateReviewStatus(payload: {
  reviewId: string;
  status: CandidateReviewStatusRecord["status"];
  reviewerStaffId?: string;
  reviewNotes?: string;
  eventRouting?: CandidateEventRouting;
  metadata: Record<string, unknown>;
}) {
  const updated = await updateRow<CandidateReviewStatusRecord>("pgems_ai_candidate_review_statuses", { id: payload.reviewId }, {
    status: payload.status,
    reviewer_staff_id: payload.reviewerStaffId ?? null,
    review_notes: payload.reviewNotes ?? null,
    metadata: payload.metadata,
  });

  if (payload.status === "approved_by_staff" || payload.status === "rejected_by_staff") {
    await notifyCandidate(
      updated.candidate_id,
      "Review completed",
      `Your profile review has been completed with status: ${payload.status}.`,
      "candidate_review",
      updated.id
    );
  }

  if (payload.eventRouting) {
    await publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: updated.candidate_id,
      profileId: updated.profile_id,
      eventName: "CandidateReviewUpdated",
      idempotencySuffix: `${updated.id}:${updated.updated_at}`,
      metadata: {},
      body: {
        reviewId: updated.id,
        reviewStatus: updated.status,
      },
    });
  }

  return updated;
}

export async function updateCandidateConflictStatus(payload: {
  conflictId: string;
  status: CandidateConflictStatus;
  reviewerStaffId?: string;
  resolutionNotes?: string;
  eventRouting?: CandidateEventRouting;
  metadata: Record<string, unknown>;
}) {
  const updated = await updateRow<CandidateConflictRecord>("pgems_ai_candidate_conflicts", { id: payload.conflictId }, {
    status: payload.status,
    reviewer_staff_id: payload.reviewerStaffId ?? null,
    resolution_notes: payload.resolutionNotes ?? null,
    resolved_at: payload.status === "resolved_by_staff" || payload.status === "dismissed_by_staff" ? new Date().toISOString() : null,
    metadata: payload.metadata,
  });

  if (payload.eventRouting) {
    const canonical = await createSupabaseAdminClient()
      .from("pgems_ai_candidate_canonical_profiles")
      .select("source_profile_id")
      .eq("id", updated.canonical_profile_id)
      .single();

    const profileId = canonical.data?.source_profile_id ?? updated.canonical_profile_id;

    await publishCandidateEvent({
      routing: payload.eventRouting,
      candidateId: updated.candidate_id,
      profileId,
      eventName: "CandidateReviewUpdated",
      idempotencySuffix: `${updated.id}:${updated.updated_at}`,
      metadata: {},
      body: {
        conflictId: updated.id,
        conflictStatus: updated.status,
        fieldPath: updated.field_path,
      },
    });
  }

  return updated;
}
