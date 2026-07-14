import { z } from "zod";

export const partnerJobRequestSchema = z.object({
  companyName: z.string().trim().min(2).max(180),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email().max(320),
  contactPhone: z.string().trim().max(32).optional().or(z.literal("")),
  companyWebsite: z.string().trim().url().max(320).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(120),
  targetHiringRegions: z.array(z.string().trim().min(2).max(120)).default([]),
  jobTitles: z.array(z.string().trim().min(2).max(120)).default([]),
  headcount: z.coerce.number().int().min(1).max(1000),
  budgetRange: z.string().trim().max(120).optional().or(z.literal("")),
  timeline: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const partnerJobRequestReviewSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["reviewing", "approved", "rejected", "fulfilled"]),
});
