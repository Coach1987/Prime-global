// Shared authorize/finalize primitives for direct-to-Supabase-Storage advertisement
// media uploads. Extracted so any advertisement upload route (admin, and
// potentially others) can issue a signed upload URL and later verify the
// resulting object without routing raw media bytes through a Next.js
// serverless function, which is capped at Vercel's platform-level request
// body limit regardless of app-level size validation.
import { createSupabaseAdminClient } from "../supabase.ts";
import { ADVERTISEMENT_BUCKET } from "./constants.ts";
import {
  buildAdvertisementMediaPath,
  getUploadValidationMessage,
  inferExtensionFromMime,
  validateAdvertisementMediaMetadata,
} from "./upload.ts";
import { verifyAdvertisementMediaObjectExists } from "./repository.ts";

export type SignedUploadAuthorization =
  | {
      ok: true;
      mediaType: "image" | "video";
      storagePath: string;
      signedUploadToken: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

export async function authorizeAdvertisementMediaUpload(input: {
  actorAuthUserId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  locale: "en" | "ar";
}): Promise<SignedUploadAuthorization> {
  const validation = validateAdvertisementMediaMetadata({
    name: input.fileName,
    type: input.mimeType,
    size: input.sizeBytes,
  });

  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_MEDIA",
      message: getUploadValidationMessage(validation.reasonKey, input.locale),
    };
  }

  const extension = inferExtensionFromMime(input.mimeType);
  const storagePath = buildAdvertisementMediaPath({
    actorAuthUserId: input.actorAuthUserId,
    extension,
    mediaType: validation.mediaType ?? "image",
    originalName: input.fileName,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(ADVERTISEMENT_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (error || !data?.token || !data?.path) {
    return {
      ok: false,
      status: 500,
      code: "UPLOAD_AUTH_FAILED",
      message:
        input.locale === "ar" ? "تعذر تجهيز رفع الملف حالياً." : "Unable to prepare media upload right now.",
    };
  }

  return {
    ok: true,
    mediaType: validation.mediaType ?? "image",
    storagePath: data.path,
    signedUploadToken: data.token,
  };
}

export type SignedUploadFinalization =
  | { ok: true; storagePath: string }
  | { ok: false; status: number; code: string; message: string };

// Pure guard, split out so it's directly unit-testable without a Supabase
// connection: an authorized upload path is always scoped to the requesting
// actor's own auth user id and the declared media type, so this rejects any
// finalize call trying to claim a storage object it wasn't authorized for.
export function isOwnedAdvertisementMediaPath(input: {
  mediaUrl: string;
  actorAuthUserId: string;
  mediaType: "image" | "video";
}): boolean {
  const normalizedPath = input.mediaUrl.trim().replace(/^\/+/, "");
  const ownerPrefix = `${input.actorAuthUserId}/`;
  return normalizedPath.startsWith(ownerPrefix) && normalizedPath.includes(`/${input.mediaType}/`);
}

export async function finalizeAdvertisementMediaUpload(input: {
  actorAuthUserId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  locale: "en" | "ar";
}): Promise<SignedUploadFinalization> {
  const normalizedPath = input.mediaUrl.trim().replace(/^\/+/, "");

  if (
    !isOwnedAdvertisementMediaPath({
      mediaUrl: input.mediaUrl,
      actorAuthUserId: input.actorAuthUserId,
      mediaType: input.mediaType,
    })
  ) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_MEDIA_URL",
      message:
        input.locale === "ar"
          ? "مسار الملف غير صالح للحساب الحالي."
          : "Media path is invalid for the current account.",
    };
  }

  const mediaCheck = await verifyAdvertisementMediaObjectExists(normalizedPath);
  if (!mediaCheck.ok) {
    return {
      ok: false,
      status: 400,
      code: mediaCheck.code,
      message: mediaCheck.message,
    };
  }

  return { ok: true, storagePath: mediaCheck.storagePath };
}
