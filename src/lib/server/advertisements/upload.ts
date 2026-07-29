import { randomUUID } from "crypto";
import sizeOf from "image-size";
import {
  ALL_ALLOWED_MIME_TYPES,
  IMAGE_ALLOWED_EXTENSIONS,
  IMAGE_ALLOWED_MIME_TYPES,
  MAX_BANNER_ASPECT_RATIO,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MIN_BANNER_ASPECT_RATIO,
  MIN_BANNER_HEIGHT,
  MIN_BANNER_WIDTH,
  VIDEO_ALLOWED_EXTENSIONS,
  VIDEO_ALLOWED_MIME_TYPES,
} from "./constants.ts";

interface UploadValidationResult {
  ok: boolean;
  reasonKey?:
    | "file_required"
    | "unsupported_mime"
    | "unsupported_extension"
    | "mime_extension_mismatch"
    | "file_too_large"
    | "empty_file"
    | "invalid_file_signature"
    | "invalid_image_dimensions";
  mediaType?: "image" | "video";
}

const VIDEO_MP4_SIGNATURE = "ftyp";
const VIDEO_WEBM_SIGNATURE = "webm";

function normalizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split(".");
  return segments.length > 1 ? segments.pop() ?? "" : "";
}

function detectImageMime(buffer: Buffer) {
  if (buffer.length >= 8) {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((value, index) => buffer[index] === value)) {
      return "image/png";
    }
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function detectVideoMime(buffer: Buffer) {
  const ascii = buffer.subarray(0, 64).toString("ascii").toLowerCase();
  if (ascii.includes(VIDEO_MP4_SIGNATURE)) {
    return "video/mp4";
  }

  if (ascii.includes(VIDEO_WEBM_SIGNATURE)) {
    return "video/webm";
  }

  return null;
}

export function validateAdvertisementMedia(file: File, buffer: Buffer): UploadValidationResult {
  if (!(file instanceof File)) {
    return { ok: false, reasonKey: "file_required" };
  }

  if (file.size <= 0) {
    return { ok: false, reasonKey: "empty_file" };
  }

  if (!ALL_ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, reasonKey: "unsupported_mime" };
  }

  const extension = getFileExtension(file.name);
  const declaredImage = IMAGE_ALLOWED_MIME_TYPES.has(file.type);
  const declaredVideo = VIDEO_ALLOWED_MIME_TYPES.has(file.type);

  if (declaredImage && !IMAGE_ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, reasonKey: "unsupported_extension" };
  }

  if (declaredVideo && !VIDEO_ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, reasonKey: "unsupported_extension" };
  }

  if (declaredImage && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reasonKey: "file_too_large" };
  }

  if (declaredVideo && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, reasonKey: "file_too_large" };
  }

  const detectedImageMime = detectImageMime(buffer);
  const detectedVideoMime = detectVideoMime(buffer);

  if (declaredImage && detectedImageMime !== file.type) {
    return { ok: false, reasonKey: "mime_extension_mismatch" };
  }

  if (declaredVideo && detectedVideoMime !== file.type) {
    return { ok: false, reasonKey: "invalid_file_signature" };
  }

  if (declaredImage) {
    const dimensions = sizeOf(buffer);
    if (!dimensions.width || !dimensions.height) {
      return { ok: false, reasonKey: "invalid_image_dimensions" };
    }

    const ratio = dimensions.width / dimensions.height;
    if (
      dimensions.width < MIN_BANNER_WIDTH ||
      dimensions.height < MIN_BANNER_HEIGHT ||
      ratio < MIN_BANNER_ASPECT_RATIO ||
      ratio > MAX_BANNER_ASPECT_RATIO
    ) {
      return { ok: false, reasonKey: "invalid_image_dimensions" };
    }

    return { ok: true, mediaType: "image" };
  }

  if (declaredVideo) {
    return { ok: true, mediaType: "video" };
  }

  return { ok: false, reasonKey: "unsupported_mime" };
}

export function buildAdvertisementMediaPath(input: {
  actorAuthUserId: string;
  extension: string;
  mediaType: "image" | "video";
  originalName: string;
}) {
  const safeName = normalizeFileName(input.originalName.replace(/\.[^.]+$/, "")) || "advertisement";
  return `${input.actorAuthUserId}/${input.mediaType}/${Date.now()}-${randomUUID()}-${safeName}.${input.extension}`;
}

export function inferExtensionFromMime(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/webm") return "webm";
  return "jpg";
}

export function getUploadValidationMessage(reasonKey: UploadValidationResult["reasonKey"], locale: "en" | "ar") {
  const messages: Record<string, { en: string; ar: string }> = {
    file_required: {
      en: "Please select an image or video file.",
      ar: "يرجى اختيار ملف صورة أو فيديو.",
    },
    unsupported_mime: {
      en: "Unsupported file format. Allowed: JPG, JPEG, PNG, WEBP, MP4, WEBM.",
      ar: "نوع الملف غير مدعوم. الأنواع المسموح بها: JPG وJPEG وPNG وWEBP وMP4 وWEBM.",
    },
    unsupported_extension: {
      en: "File extension is not allowed for this media type.",
      ar: "امتداد الملف غير مسموح لهذا النوع من الوسائط.",
    },
    mime_extension_mismatch: {
      en: "File content does not match the declared image type.",
      ar: "محتوى الملف لا يطابق نوع الصورة المعلن.",
    },
    file_too_large: {
      en: "File is too large. Images up to 8MB and videos up to 50MB are allowed.",
      ar: "حجم الملف كبير جداً. الحد الأقصى للصور 8MB وللفيديو 50MB.",
    },
    empty_file: {
      en: "The selected file is empty.",
      ar: "الملف المحدد فارغ.",
    },
    invalid_file_signature: {
      en: "File signature is invalid or suspicious.",
      ar: "توقيع الملف غير صالح أو مشبوه.",
    },
    invalid_image_dimensions: {
      en: "Image dimensions are not suitable for homepage banners. Minimum 1200x420 with a wide aspect ratio.",
      ar: "أبعاد الصورة غير مناسبة لبانر الصفحة الرئيسية. الحد الأدنى 1200x420 بنسبة عرض عريضة.",
    },
  };

  if (!reasonKey) {
    return locale === "ar" ? "فشل التحقق من الملف." : "Media validation failed.";
  }

  return messages[reasonKey][locale];
}
