import {
  consumeEventForAiPlatform,
  createAiRequest,
  executeAiTaskFoundation,
  publishAiPlatformEvent,
} from "../ai-platform/index";
import { createSupabaseAdminClient } from "../../supabase.ts";
import { normalizeSkill } from "./normalization.ts";
import { evaluateAdvisoryRecommendation } from "./review.ts";
import { buildCandidateTimeline } from "./timeline.ts";
import type {
  CandidateAiRecommendationRecord,
  CandidateCertificationExtractionRecord,
  CandidateConfidenceScoreRecord,
  CandidateDocumentAnalysisRecord,
  CandidateEducationExtractionRecord,
  CandidateExperienceExtractionRecord,
  CandidateLanguageExtractionRecord,
  CandidateProfessionalProfileRecord,
  CandidateReviewStatusRecord,
  CandidateSkillExtractionRecord,
  CandidateTimelineEntryRecord,
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
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
    needsManualReview: false,
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

  const eventBase = {
    eventTypeId: payload.eventRouting.eventTypeId,
    categoryId: payload.eventRouting.categoryId,
    channelId: payload.eventRouting.channelId,
    publisherId: payload.eventRouting.publisherId,
    queueId: payload.eventRouting.queueId,
    kind: "domain" as const,
    priority: "normal" as const,
    status: "queued" as const,
    correlationId: `candidate:${payload.candidateId}:profile`,
    traceId: `candidate:${payload.candidateId}:profile:${Date.now()}`,
    maxRetryCount: 5,
  };

  const publishedEvents = await Promise.all([
    publishAiPlatformEvent({
      ...eventBase,
      idempotencyKey: `candidate-profile-created:${profile.id}`,
      payload: {
        eventName: "CandidateProfileCreated",
        candidateId: payload.candidateId,
        profileId: profile.id,
      },
      metadata: {},
    }),
    publishAiPlatformEvent({
      ...eventBase,
      idempotencyKey: `candidate-extraction-completed:${profile.id}`,
      payload: {
        eventName: "CandidateExtractionCompleted",
        candidateId: payload.candidateId,
        profileId: profile.id,
      },
      metadata: {},
    }),
    publishAiPlatformEvent({
      ...eventBase,
      idempotencyKey: `candidate-review-requested:${profile.id}`,
      payload: {
        eventName: "CandidateReviewRequested",
        candidateId: payload.candidateId,
        profileId: profile.id,
        reviewStatus: review.status,
      },
      metadata: {},
    }),
    publishAiPlatformEvent({
      ...eventBase,
      idempotencyKey: `candidate-profile-updated:${profile.id}`,
      payload: {
        eventName: "CandidateProfileUpdated",
        candidateId: payload.candidateId,
        profileId: profile.id,
      },
      metadata: {},
    }),
  ]);

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
  metadata: Record<string, unknown>;
}) {
  return updateRow<CandidateReviewStatusRecord>("pgems_ai_candidate_review_statuses", { id: payload.reviewId }, {
    status: payload.status,
    reviewer_staff_id: payload.reviewerStaffId ?? null,
    review_notes: payload.reviewNotes ?? null,
    metadata: payload.metadata,
  });
}
