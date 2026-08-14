import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCreatePayload,
  buildInitialForm,
  getFileExtension,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  validateSelectedMediaFile,
} from "./admin-form-helpers.ts";

test("buildInitialForm defaults target_url to the real candidate registration route", () => {
  const form = buildInitialForm();
  const url = new URL(form.target_url);

  assert.equal(url.pathname, "/auth");
  assert.equal(url.searchParams.get("mode"), "register");
  assert.equal(url.searchParams.get("audience"), "candidate");
  // No locale segment: SponsoredAdvertisementsCarousel's locale-aware Link
  // adds it per viewer at render time (item 8's requirement).
  assert.equal(url.pathname.startsWith("/en/") || url.pathname.startsWith("/ar/"), false);
});

test("getFileExtension handles multi-dot names and missing extensions", () => {
  assert.equal(getFileExtension("prime-global-ad.final.mp4"), "mp4");
  assert.equal(getFileExtension("noextension"), "");
});

test("validateSelectedMediaFile accepts a valid mp4 within the size cap", () => {
  const result = validateSelectedMediaFile(
    { name: "ad.mp4", type: "video/mp4", size: 5 * 1024 * 1024 },
    false
  );

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.inferredMediaType, "video");
});

test("validateSelectedMediaFile accepts a valid image within the size cap", () => {
  const result = validateSelectedMediaFile(
    { name: "banner.png", type: "image/png", size: 2 * 1024 * 1024 },
    false
  );

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.inferredMediaType, "image");
});

test("validateSelectedMediaFile rejects a missing file", () => {
  const result = validateSelectedMediaFile(null, false);
  assert.equal(result.ok, false);
});

test("validateSelectedMediaFile rejects an unsupported MIME type", () => {
  const result = validateSelectedMediaFile({ name: "ad.mov", type: "video/quicktime", size: 1024 }, false);
  assert.equal(result.ok, false);
});

test("validateSelectedMediaFile rejects extension/MIME mismatch", () => {
  const result = validateSelectedMediaFile({ name: "ad.png", type: "video/mp4", size: 1024 }, false);
  assert.equal(result.ok, false);
});

test("validateSelectedMediaFile rejects an oversized video (matches server 50MB cap)", () => {
  const result = validateSelectedMediaFile(
    { name: "ad.mp4", type: "video/mp4", size: MAX_VIDEO_BYTES + 1 },
    false
  );
  assert.equal(result.ok, false);
});

test("validateSelectedMediaFile rejects an oversized image (matches server 8MB cap)", () => {
  const result = validateSelectedMediaFile(
    { name: "ad.png", type: "image/png", size: MAX_IMAGE_BYTES + 1 },
    false
  );
  assert.equal(result.ok, false);
});

test("validateSelectedMediaFile returns Arabic messages when isArabic is true", () => {
  const result = validateSelectedMediaFile(null, true);
  assert.equal(result.ok, false);
  assert.match(result.message, /[؀-ۿ]/);
});

test("buildCreatePayload converts empty schedule fields to null, not empty strings", () => {
  const form = { ...buildInitialForm(), starts_at: "", ends_at: "" };
  const payload = buildCreatePayload(form);
  assert.equal(payload.starts_at, null);
  assert.equal(payload.ends_at, null);
});

test("buildCreatePayload converts populated schedule fields to ISO strings", () => {
  const form = { ...buildInitialForm(), starts_at: "2026-09-01T10:00", ends_at: "2026-12-01T10:00" };
  const payload = buildCreatePayload(form);
  assert.equal(new Date(payload.starts_at).toISOString(), payload.starts_at);
  assert.equal(new Date(payload.ends_at).toISOString(), payload.ends_at);
});
