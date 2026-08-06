import { z } from "zod";
import { AD_MEDIA_TYPES, AD_STATUSES } from "./types";

export const advertisementBaseSchema = z.object({
  title_ar: z.string().trim().min(3).max(180),
  title_en: z.string().trim().min(3).max(180),
  description_ar: z.string().trim().min(10).max(2000),
  description_en: z.string().trim().min(10).max(2000),
  media_type: z.enum(AD_MEDIA_TYPES),
  // min length not enforced here — the API route calls verifyAdvertisementMediaObjectExists which returns INVALID_MEDIA_URL for empty paths
  media_url: z.string().trim().max(500),
  media_alt_ar: z.string().trim().min(2).max(240),
  media_alt_en: z.string().trim().min(2).max(240),
  target_url: z.string().trim().url().max(1000),
  cta_text_ar: z.string().trim().min(2).max(80),
  cta_text_en: z.string().trim().min(2).max(80),
  priority: z.coerce.number().int().min(1).max(10000).default(100),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
});

export const createAdvertisementSchema = advertisementBaseSchema;

export const updateAdvertisementSchema = advertisementBaseSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided"
);

export const advertisementActionSchema = z.object({
  action: z.enum(["submit_review", "approve", "reject", "request_edits", "activate", "hide", "pause", "republish"]),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const advertisementStatusFilterSchema = z.object({
  status: z.enum(["all", ...AD_STATUSES]).default("all"),
});

export const advertisementAnalyticsEventSchema = z.object({
  eventType: z.enum(["impression", "click"]),
  locale: z.enum(["en", "ar"]),
  sessionId: z.string().trim().min(16).max(128),
});
