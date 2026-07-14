import { z } from "zod";

export const companyVerificationRequestSchema = z.object({
  companyName: z.string().trim().min(2).max(180),
  commercialRegistrationNumber: z.string().trim().min(2).max(80),
  taxNumber: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  officialEmail: z.string().trim().email().max(320),
  website: z.string().trim().url().max(320).optional().or(z.literal("")),
  phoneNumber: z.string().trim().min(6).max(32),
  responsiblePerson: z.string().trim().min(2).max(120),
});

export const verificationReviewSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "suspended"]),
  reviewerNotes: z.string().trim().max(2000).optional(),
});
