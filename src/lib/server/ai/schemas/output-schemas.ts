import { z } from "zod";
import type { AiTaskType } from "../contracts/types.ts";

const ConfidenceSchema = z.number().min(0).max(1);

const ProvenanceRefSchema = z
  .object({
    source: z.enum(["cv", "candidate_edit", "prime_edit", "system"]),
    reference: z.string().min(1),
  })
  .strict();

const FieldConfidenceSchema = z
  .object({
    fieldPath: z.string().min(1),
    confidence: ConfidenceSchema,
    source: z.enum(["ai", "candidate_edit", "prime_edit"]),
  })
  .strict();

const SkillSchema = z
  .object({
    name: z.string().min(1),
    confidence: ConfidenceSchema,
    provenance: ProvenanceRefSchema.optional(),
  })
  .strict();

const EducationSchema = z
  .object({
    institution: z.string().min(1),
    degree: z.string().min(1).optional(),
    confidence: ConfidenceSchema,
    provenance: ProvenanceRefSchema.optional(),
  })
  .strict();

const ExperienceSchema = z
  .object({
    title: z.string().min(1),
    company: z.string().min(1).optional(),
    confidence: ConfidenceSchema,
    provenance: ProvenanceRefSchema.optional(),
  })
  .strict();

const LanguageSchema = z
  .object({
    name: z.string().min(1),
    level: z.string().min(1).optional(),
    confidence: ConfidenceSchema,
    provenance: ProvenanceRefSchema.optional(),
  })
  .strict();

const CertificationSchema = z
  .object({
    name: z.string().min(1),
    issuer: z.string().min(1).optional(),
    confidence: ConfidenceSchema,
    provenance: ProvenanceRefSchema.optional(),
  })
  .strict();

export const ExplainableMatchingFactorsSchema = z
  .object({
    schemaVersion: z.string().min(1),
    factors: z.array(
      z
        .object({
          factor: z.string().min(1),
          weight: z.number(),
          contribution: z.number(),
          reason: z.string().min(1).optional(),
          confidence: ConfidenceSchema,
          provenance: ProvenanceRefSchema.optional(),
        })
        .strict()
    ),
  })
  .strict();

export const CvExtractionResultSchema = z
  .object({
    schemaVersion: z.string().min(1),
    professionalTitle: z.string().nullable().optional(),
    professionalSummary: z.string().nullable().optional(),
    skills: z.array(SkillSchema),
    education: z.array(EducationSchema),
    employmentHistory: z.array(ExperienceSchema),
    languages: z.array(LanguageSchema),
    certifications: z.array(CertificationSchema),
    fieldConfidence: z.array(FieldConfidenceSchema).optional(),
    provenanceRefs: z.array(ProvenanceRefSchema).optional(),
  })
  .strict();

export const ProfileRecommendationsSchema = z
  .object({
    schemaVersion: z.string().min(1),
    recommendations: z.array(
      z
        .object({
          recommendationId: z.string().min(1),
          title: z.string().min(1),
          rationale: z.string().min(1),
          confidence: ConfidenceSchema,
          provenance: ProvenanceRefSchema.optional(),
        })
        .strict()
    ),
    fieldConfidence: z.array(FieldConfidenceSchema).optional(),
    provenanceRefs: z.array(ProvenanceRefSchema).optional(),
  })
  .strict();

export const SkillNormalizationResultSchema = z
  .object({
    schemaVersion: z.string().min(1),
    skills: z.array(
      z
        .object({
          rawSkill: z.string().min(1),
          mappedSkillId: z.string().nullable(),
          mappedSkillName: z.string().nullable(),
          confidence: ConfidenceSchema,
          provenance: ProvenanceRefSchema.optional(),
        })
        .strict()
    ),
    fieldConfidence: z.array(FieldConfidenceSchema).optional(),
    provenanceRefs: z.array(ProvenanceRefSchema).optional(),
  })
  .strict();

export const CandidateRescoringResultSchema = z
  .object({
    schemaVersion: z.string().min(1),
    score: z.number().min(0).max(100),
    explanation: ExplainableMatchingFactorsSchema,
    fieldConfidence: z.array(FieldConfidenceSchema).optional(),
    provenanceRefs: z.array(ProvenanceRefSchema).optional(),
  })
  .strict();

export const MatchingExplanationSchema = z
  .object({
    schemaVersion: z.string().min(1),
    summary: z.string().min(1),
    factors: ExplainableMatchingFactorsSchema.shape.factors,
    fieldConfidence: z.array(FieldConfidenceSchema).optional(),
    provenanceRefs: z.array(ProvenanceRefSchema).optional(),
  })
  .strict();

export const StructuredOutputSchemas: Partial<Record<AiTaskType, z.ZodTypeAny>> = {
  cv_extract: CvExtractionResultSchema,
  recommendations: ProfileRecommendationsSchema,
  skill_normalization: SkillNormalizationResultSchema,
  candidate_rescoring: CandidateRescoringResultSchema,
  matching_explanation: MatchingExplanationSchema,
};

export type CvExtractionResult = z.infer<typeof CvExtractionResultSchema>;
export type ProfileRecommendationsResult = z.infer<typeof ProfileRecommendationsSchema>;
export type SkillNormalizationResult = z.infer<typeof SkillNormalizationResultSchema>;
export type CandidateRescoringResult = z.infer<typeof CandidateRescoringResultSchema>;
export type MatchingExplanationResult = z.infer<typeof MatchingExplanationSchema>;