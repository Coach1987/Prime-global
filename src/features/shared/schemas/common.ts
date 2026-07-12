import { z } from "zod";

export const uploadedDocumentMetadataSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  storagePath: z.string().min(1),
  uploadedAtIso: z.string().datetime(),
});

export const careerApplicationSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5).optional(),
  position: z.string().min(2),
  status: z.enum([
    "submitted",
    "under_review",
    "shortlisted",
    "interview",
    "rejected",
    "hired",
  ]),
  documents: z.array(uploadedDocumentMetadataSchema),
  createdAtIso: z.string().datetime(),
  updatedAtIso: z.string().datetime(),
});

export const contactRequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().min(1).optional(),
  message: z.string().min(10),
  createdAtIso: z.string().datetime(),
});

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const dashboardStatisticsSchema = z.object({
  totalApplicants: z.number().int().nonnegative(),
  newApplicantsToday: z.number().int().nonnegative(),
  openRoles: z.number().int().nonnegative(),
  contactRequests: z.number().int().nonnegative(),
});
