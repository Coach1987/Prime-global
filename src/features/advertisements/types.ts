export const AD_MEDIA_TYPES = ["image", "video"] as const;
export type AdvertisementMediaType = (typeof AD_MEDIA_TYPES)[number];

export const AD_STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "active",
  "paused",
  "expired",
] as const;
export type AdvertisementStatus = (typeof AD_STATUSES)[number];

export const AD_MODERATION_STATUSES = ["pending", "passed", "needs_review", "failed"] as const;
export type AdvertisementModerationStatus = (typeof AD_MODERATION_STATUSES)[number];

export interface AdvertisementRecord {
  id: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  media_type: AdvertisementMediaType;
  media_url: string;
  media_alt_ar: string;
  media_alt_en: string;
  target_url: string;
  cta_text_ar: string;
  cta_text_en: string;
  status: AdvertisementStatus;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  moderation_status: AdvertisementModerationStatus;
  moderation_reason: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicAdvertisementItem {
  id: string;
  mediaType: AdvertisementMediaType;
  mediaUrl: string;
  mediaAlt: string;
  title: string;
  description: string;
  targetUrl: string;
  ctaText: string;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
}
