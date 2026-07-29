import type { AppRole } from "@/lib/server/security/auth";

export const ADVERTISEMENT_BUCKET = "advertisement-media";

export const AD_ADMIN_ROLES: AppRole[] = [
  "prime_global_recruiter",
  "prime_global_admin",
  "admin",
  "super_admin",
];

export const IMAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const VIDEO_ALLOWED_MIME_TYPES = new Set(["video/mp4", "video/webm"]);

export const ALL_ALLOWED_MIME_TYPES = new Set([
  ...IMAGE_ALLOWED_MIME_TYPES,
  ...VIDEO_ALLOWED_MIME_TYPES,
]);

export const IMAGE_ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
export const VIDEO_ALLOWED_EXTENSIONS = new Set(["mp4", "webm"]);

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const MIN_BANNER_WIDTH = 1200;
export const MIN_BANNER_HEIGHT = 420;
export const MIN_BANNER_ASPECT_RATIO = 1.8;
export const MAX_BANNER_ASPECT_RATIO = 3.2;
