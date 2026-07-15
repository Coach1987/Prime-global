import { z } from "zod";

const uuidSchema = z.string().uuid();

export const evidenceLookupQuerySchema = z.object({
  evidenceCaseId: uuidSchema.optional(),
  evidenceEventId: uuidSchema.optional(),
});

export const evidenceAccessSchema = z.object({
  evidenceCaseId: uuidSchema.optional(),
  evidenceEventId: uuidSchema.optional(),
  reason: z.string().trim().min(3).max(500),
  accessAction: z.string().trim().min(3).max(80),
  policyName: z.string().trim().min(3).max(120).optional(),
  policyVersion: z.string().trim().min(1).max(40).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const evidenceExportSchema = z.object({
  evidenceCaseId: uuidSchema.optional(),
  evidenceEventId: uuidSchema.optional(),
  reason: z.string().trim().min(3).max(500),
  metadata: z.record(z.unknown()).optional(),
});

export const evidenceLegalHoldSchema = z.object({
  evidenceCaseId: uuidSchema.optional(),
  evidenceEventId: uuidSchema.optional(),
  reason: z.string().trim().min(3).max(500),
  legalHoldState: z.enum(["active", "released"]),
  metadata: z.record(z.unknown()).optional(),
});

export const evidenceCorrectionSchema = z.object({
  sourceEvidenceEventId: uuidSchema,
  contentHash: z.string().trim().min(8).max(128),
  redactedExcerpt: z.string().trim().min(1).max(4000).optional(),
  normalizedSummary: z.string().trim().min(1).max(4000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const evidenceChainVerificationSchema = z.object({
  evidenceCaseId: uuidSchema,
});
