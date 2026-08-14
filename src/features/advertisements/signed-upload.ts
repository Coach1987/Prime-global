// Client-side helper for uploading advertisement media directly to Supabase
// Storage via a signed upload URL, so raw media bytes never pass through a
// Next.js serverless function (which is capped at Vercel's platform-level
// request body limit, ~4.5MB, independent of app-level size validation).
// Originally written for the employer advertisement flow; extracted here so
// the admin advertisement flow can reuse the exact same upload mechanics
// instead of a second implementation.

export function normalizeSupabasePublicUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    if (normalizedPath === "/rest/v1") {
      url.pathname = "";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return value.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  }
}

export function toEncodedObjectPath(storagePath: string) {
  return storagePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function buildSignedUploadEndpoint(input: {
  supabaseUrl: string;
  bucket: string;
  storagePath: string;
  uploadToken: string;
}) {
  return `${input.supabaseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(input.bucket)}/${toEncodedObjectPath(input.storagePath)}?token=${encodeURIComponent(input.uploadToken)}`;
}

export function uploadToSignedUrl(input: {
  supabaseUrl: string;
  bucket: string;
  storagePath: string;
  uploadToken: string;
  file: File;
  onProgress?: (value: number) => void;
}): Promise<void> {
  const endpoint = buildSignedUploadEndpoint(input);

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", endpoint);
    xhr.setRequestHeader("content-type", input.file.type);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const progress = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      input.onProgress?.(progress);
    };
    xhr.onerror = () => reject(new Error("Direct upload failed before completion."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      let message = "Unable to upload media.";
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string | { message?: string } };
        if (typeof body.error === "string") {
          message = body.error;
        } else if (body.error?.message) {
          message = body.error.message;
        }
      } catch {
        if (xhr.responseText?.trim()) {
          message = xhr.responseText.trim();
        }
      }

      reject(new Error(message));
    };
    xhr.send(input.file);
  });
}
