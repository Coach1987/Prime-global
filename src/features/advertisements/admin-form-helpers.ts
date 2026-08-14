// Pure helpers for the admin "Create Official Advertisement" form. Kept out
// of AdvertisementsAdminCenter.tsx (a "use client" component with JSX) so
// they're importable from a plain node:test file, matching this repo's test
// convention. Mirrors — and must stay in sync with — the server-side rules
// in src/lib/server/advertisements/constants.ts and upload.ts; the server
// route re-validates independently regardless, so drift here is a UX
// annoyance, not a security gap.
import { SITE_URL } from "../../lib/constants/site.ts";

export const IMAGE_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const VIDEO_ALLOWED_MIME_TYPES = new Set(["video/mp4", "video/webm"]);
export const IMAGE_ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
export const VIDEO_ALLOWED_EXTENSIONS = new Set(["mp4", "webm"]);
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type AdvertisementFormState = {
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  media_type: "image" | "video";
  media_url: string;
  media_alt_ar: string;
  media_alt_en: string;
  target_url: string;
  cta_text_ar: string;
  cta_text_en: string;
  priority: number;
  starts_at: string;
  ends_at: string;
};

export function buildInitialForm(): AdvertisementFormState {
  return {
    title_ar: "",
    title_en: "",
    description_ar: "",
    description_en: "",
    media_type: "image",
    media_url: "",
    media_alt_ar: "",
    media_alt_en: "",
    // Host-only + query, no locale segment: SponsoredAdvertisementsCarousel
    // resolves internal targets through next-intl's locale-aware Link, so
    // this renders as /en/auth?... or /ar/auth?... per viewer locale.
    target_url: `${SITE_URL}/auth?mode=register&audience=candidate`,
    cta_text_ar: "",
    cta_text_en: "",
    priority: 100,
    starts_at: "",
    ends_at: "",
  };
}

export function getFileExtension(fileName: string): string {
  const segments = fileName.toLowerCase().split(".");
  return segments.length > 1 ? segments.pop() ?? "" : "";
}

export type MediaFileLike = { name: string; type: string; size: number };

export type MediaValidationResult =
  | { ok: true; inferredMediaType: "image" | "video" }
  | { ok: false; message: string };

export function validateSelectedMediaFile(file: MediaFileLike | null, isArabic: boolean): MediaValidationResult {
  if (!file) {
    return {
      ok: false,
      message: isArabic ? "يرجى اختيار ملف صورة أو فيديو." : "Please select an image or video file.",
    };
  }

  const extension = getFileExtension(file.name);
  const isImage = IMAGE_ALLOWED_MIME_TYPES.has(file.type);
  const isVideo = VIDEO_ALLOWED_MIME_TYPES.has(file.type);

  if (!isImage && !isVideo) {
    return {
      ok: false,
      message: isArabic
        ? "نوع الملف غير مدعوم. الأنواع المسموح بها: JPG وJPEG وPNG وWEBP وMP4 وWEBM."
        : "Unsupported file format. Allowed: JPG, JPEG, PNG, WEBP, MP4, WEBM.",
    };
  }

  if (isImage && !IMAGE_ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      message: isArabic ? "امتداد الملف لا يطابق نوع الصورة المسموح." : "File extension does not match the allowed image formats.",
    };
  }

  if (isVideo && !VIDEO_ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      message: isArabic ? "امتداد الملف لا يطابق نوع الفيديو المسموح." : "File extension does not match the allowed video formats.",
    };
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: isArabic ? "حجم الصورة كبير جداً. الحد الأقصى للصور هو 8MB." : "Image file is too large. Maximum allowed image size is 8MB.",
    };
  }

  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      message: isArabic ? "حجم الفيديو كبير جداً. الحد الأقصى للفيديو هو 50MB." : "Video file is too large. Maximum allowed video size is 50MB.",
    };
  }

  return { ok: true, inferredMediaType: isVideo ? "video" : "image" };
}

export function buildCreatePayload(form: AdvertisementFormState) {
  return {
    ...form,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
  };
}
