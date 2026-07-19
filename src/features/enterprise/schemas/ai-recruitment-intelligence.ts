import { z } from "zod";

const codeSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9_.:-]+$/i);
const metadataSchema = z.record(z.unknown()).default({});
const localeSchema = z.string().trim().min(2).max(16).default("en");

export const candidateDocumentTypeSchema = z.enum([
  "cv_resume",
  "diploma",
  "certificate",
  "training_certificate",
  "language_certificate",
  "identity_document",
  "portfolio",
  "future",
]);

export const candidateReviewStatusSchema = z.enum([
  "pending_review",
  "approved_by_staff",
  "rejected_by_staff",
  "needs_manual_review",
]);

export const candidateRecommendationSchema = z.enum([
  "advisory_fit",
  "advisory_partial_fit",
  "advisory_low_confidence",
  "advisory_needs_manual_review",
]);

export const candidateConflictStatusSchema = z.enum([
  "needs_staff_review",
  "in_review",
  "resolved_by_staff",
  "dismissed_by_staff",
]);

export const smartJobMatchReviewStatusSchema = z.enum([
  "pending_review",
  "approved_by_staff",
  "rejected_by_staff",
  "needs_manual_review",
]);

export const smartJobMatchCategorySchema = z.enum([
  "excellent_match",
  "strong_match",
  "good_match",
  "possible_match",
  "weak_match",
  "no_match",
]);

export const eventRoutingSchema = z.object({
  eventTypeId: z.string().uuid(),
  categoryId: z.string().uuid(),
  channelId: z.string().uuid(),
  publisherId: z.string().uuid(),
  queueId: z.string().uuid(),
});

export const extractionEvidenceSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  extractionSource: z.string().trim().min(1).max(120),
  documentReference: z.string().trim().min(1).max(200),
  aiModelUsed: z.string().trim().min(1).max(120),
  extractionTimestamp: z.string().datetime(),
});

export const createCandidateDocumentAnalysisSchema = z.object({
  candidateId: z.string().uuid(),
  documentType: candidateDocumentTypeSchema,
  storagePath: z.string().trim().min(1).max(300),
  documentHash: z.string().trim().min(1).max(200),
  locale: localeSchema,
  analysisSummary: z.string().trim().max(4000).default(""),
  extractedPayload: metadataSchema,
  metadata: metadataSchema,
});

export const createSkillTaxonomySchema = z.object({
  canonicalCode: codeSchema,
  canonicalName: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(120),
  locale: localeSchema,
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createSkillAliasSchema = z.object({
  taxonomyId: z.string().uuid(),
  aliasText: z.string().trim().min(1).max(160),
  locale: localeSchema,
  metadata: metadataSchema,
  isActive: z.boolean().default(true),
});

export const createCandidateProfessionalProfileSchema = z.object({
  candidateId: z.string().uuid(),
  headline: z.string().trim().max(240).optional(),
  summary: z.string().trim().max(6000).default(""),
  locale: localeSchema,
  sourceDocumentAnalysisIds: z.array(z.string().uuid()).default([]),
  metadata: metadataSchema,
});

const extractionBaseSchema = z.object({
  profileId: z.string().uuid(),
  candidateId: z.string().uuid(),
  metadata: metadataSchema,
}).merge(extractionEvidenceSchema);

export const createCandidateSkillExtractionSchema = extractionBaseSchema.extend({
  rawSkill: z.string().trim().min(1).max(160),
  normalizedTaxonomyId: z.string().uuid().optional(),
  normalizedSkillName: z.string().trim().min(1).max(160),
  proficiencyLevel: z.enum(["beginner", "intermediate", "advanced", "expert"]).default("intermediate"),
});

export const createCandidateExperienceExtractionSchema = extractionBaseSchema.extend({
  roleTitle: z.string().trim().min(1).max(200),
  organizationName: z.string().trim().min(1).max(200),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().trim().max(4000).default(""),
});

export const createCandidateEducationExtractionSchema = extractionBaseSchema.extend({
  institutionName: z.string().trim().min(1).max(200),
  degreeTitle: z.string().trim().min(1).max(200),
  fieldOfStudy: z.string().trim().max(200).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  grade: z.string().trim().max(80).optional(),
});

export const createCandidateCertificationExtractionSchema = extractionBaseSchema.extend({
  certificationName: z.string().trim().min(1).max(200),
  issuingOrganization: z.string().trim().max(200).optional(),
  issueDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  credentialId: z.string().trim().max(120).optional(),
});

export const createCandidateLanguageExtractionSchema = extractionBaseSchema.extend({
  languageName: z.string().trim().min(1).max(120),
  normalizedCode: z.string().trim().max(20).optional(),
  proficiencyLevel: z.enum(["basic", "conversational", "professional", "native"]).default("conversational"),
});

export const createCandidateTimelineEntrySchema = z.object({
  profileId: z.string().uuid(),
  candidateId: z.string().uuid(),
  entryType: z.enum(["experience", "education", "certification", "language", "skill", "milestone"]),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(4000).default(""),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  metadata: metadataSchema,
});

export const createCandidateConfidenceScoreSchema = z.object({
  profileId: z.string().uuid(),
  candidateId: z.string().uuid(),
  overallConfidence: z.number().min(0).max(1),
  skillsConfidence: z.number().min(0).max(1).default(0),
  experienceConfidence: z.number().min(0).max(1).default(0),
  educationConfidence: z.number().min(0).max(1).default(0),
  certificationConfidence: z.number().min(0).max(1).default(0),
  languageConfidence: z.number().min(0).max(1).default(0),
  metadata: metadataSchema,
});

export const createCandidateReviewStatusSchema = z.object({
  profileId: z.string().uuid(),
  candidateId: z.string().uuid(),
  status: candidateReviewStatusSchema.default("pending_review"),
  reviewerStaffId: z.string().uuid().optional(),
  reviewNotes: z.string().trim().max(4000).optional(),
  metadata: metadataSchema,
});

export const createCandidateAiRecommendationSchema = z.object({
  profileId: z.string().uuid(),
  candidateId: z.string().uuid(),
  recommendation: candidateRecommendationSchema,
  recommendationSummary: z.string().trim().max(4000).default(""),
  advisoryOnly: z.boolean().default(true),
  metadata: metadataSchema,
});

export const generateCandidateProfileSchema = z.object({
  candidateId: z.string().uuid(),
  documentAnalysisIds: z.array(z.string().uuid()).min(1),
  aiTaskId: z.string().uuid(),
  aiPromptVersionId: z.string().uuid().optional(),
  locale: localeSchema,
  inputPayload: metadataSchema,
  profileDraft: z.object({
    headline: z.string().trim().max(240).optional(),
    summary: z.string().trim().max(6000).default(""),
  }).default({ summary: "" }),
  extracted: z.object({
    skills: z.array(createCandidateSkillExtractionSchema.omit({ profileId: true, candidateId: true })).default([]),
    experiences: z.array(createCandidateExperienceExtractionSchema.omit({ profileId: true, candidateId: true })).default([]),
    educations: z.array(createCandidateEducationExtractionSchema.omit({ profileId: true, candidateId: true })).default([]),
    certifications: z.array(createCandidateCertificationExtractionSchema.omit({ profileId: true, candidateId: true })).default([]),
    languages: z.array(createCandidateLanguageExtractionSchema.omit({ profileId: true, candidateId: true })).default([]),
  }).default({ skills: [], experiences: [], educations: [], certifications: [], languages: [] }),
  eventRouting: eventRoutingSchema,
  metadata: metadataSchema,
});

export const consumeRecruitmentEventSchema = z.object({
  eventId: z.string().uuid(),
  metadata: metadataSchema,
});

export const updateCandidateReviewStatusSchema = z.object({
  status: candidateReviewStatusSchema.default("pending_review"),
  reviewerStaffId: z.string().uuid().optional(),
  reviewNotes: z.string().trim().max(4000).optional(),
  eventRouting: eventRoutingSchema.optional(),
  metadata: metadataSchema,
});

export const updateCandidateConflictSchema = z.object({
  status: candidateConflictStatusSchema,
  reviewerStaffId: z.string().uuid().optional(),
  resolutionNotes: z.string().trim().max(4000).optional(),
  eventRouting: eventRoutingSchema.optional(),
  metadata: metadataSchema,
});

const smartJobJobProfileSchema = z.object({
  jobId: z.string().uuid(),
  title: z.string().trim().min(1).max(240),
  requiredSkills: z.array(z.string().trim().min(1).max(160)).default([]),
  preferredSkills: z.array(z.string().trim().min(1).max(160)).default([]),
  minimumYearsExperience: z.number().min(0).max(80).optional(),
  requiredEducationLevels: z.array(z.string().trim().min(1).max(200)).default([]),
  requiredCertifications: z.array(z.string().trim().min(1).max(200)).default([]),
  requiredLanguages: z.array(z.string().trim().min(1).max(120)).default([]),
  country: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  workAuthorizationRequired: z.boolean().default(false),
  employmentType: z.string().trim().max(80).optional(),
  industry: z.string().trim().max(160).optional(),
  specialization: z.string().trim().max(160).optional(),
  availability: z.string().trim().max(80).optional(),
  careerLevel: z.string().trim().max(80).optional(),
  jobFunction: z.string().trim().max(120).optional(),
});

const smartJobCandidateContextSchema = z.object({
  yearsExperience: z.number().min(0).max(80).optional(),
  educationLevels: z.array(z.string().trim().min(1).max(200)).optional(),
  certifications: z.array(z.string().trim().min(1).max(200)).optional(),
  languages: z.array(z.string().trim().min(1).max(120)).optional(),
  country: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  workAuthorization: z.boolean().optional(),
  employmentType: z.string().trim().max(80).optional(),
  industry: z.string().trim().max(160).optional(),
  specialization: z.string().trim().max(160).optional(),
  availability: z.string().trim().max(80).optional(),
  careerLevel: z.string().trim().max(80).optional(),
  jobFunction: z.string().trim().max(120).optional(),
}).default({});

export const createSmartJobMatchSchema = z.object({
  candidateId: z.string().uuid(),
  canonicalProfileId: z.string().uuid(),
  aiTaskId: z.string().uuid(),
  aiPromptVersionId: z.string().uuid().optional(),
  locale: localeSchema,
  inputPayload: metadataSchema,
  aiModelUsed: z.string().trim().min(1).max(120),
  jobProfile: smartJobJobProfileSchema,
  candidateContext: smartJobCandidateContextSchema,
  eventRouting: eventRoutingSchema,
  metadata: metadataSchema,
});

export const updateSmartJobMatchReviewSchema = z.object({
  status: smartJobMatchReviewStatusSchema,
  reviewerStaffId: z.string().uuid().optional(),
  reviewNotes: z.string().trim().max(4000).optional(),
  eventRouting: eventRoutingSchema.optional(),
  metadata: metadataSchema,
});
