import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isOwnedAdvertisementMediaPath } from "./signed-upload.ts";
import { validateAdvertisementMediaMetadata } from "./upload.ts";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "./constants.ts";

// Computed relative to this file so these checks work in any checkout path,
// unlike advertisements-mvp.test.mjs's hardcoded /workspaces/Prime-global.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin authorize accepts valid MP4 metadata", () => {
  const result = validateAdvertisementMediaMetadata({
    name: "recruitment-ad.mp4",
    type: "video/mp4",
    size: 20 * 1024 * 1024,
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.mediaType, "video");
});

test("admin authorize accepts valid image metadata", () => {
  const result = validateAdvertisementMediaMetadata({
    name: "banner.png",
    type: "image/png",
    size: 2 * 1024 * 1024,
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.mediaType, "image");
});

test("admin authorize rejects an unsupported MIME type", () => {
  const result = validateAdvertisementMediaMetadata({
    name: "promo.mov",
    type: "video/quicktime",
    size: 1024,
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reasonKey, "unsupported_mime");
});

test("admin authorize rejects oversize video (matches server 50MB cap)", () => {
  const result = validateAdvertisementMediaMetadata({
    name: "recruitment-ad.mp4",
    type: "video/mp4",
    size: MAX_VIDEO_BYTES + 1,
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reasonKey, "file_too_large");
});

test("admin authorize rejects oversize image (matches server 8MB cap)", () => {
  const result = validateAdvertisementMediaMetadata({
    name: "banner.png",
    type: "image/png",
    size: MAX_IMAGE_BYTES + 1,
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reasonKey, "file_too_large");
});

test("finalize ownership check accepts a path under the actor's own prefix and media type segment", () => {
  const owned = isOwnedAdvertisementMediaPath({
    mediaUrl: "actor-123/video/1699999999-abc-recruitment-ad.mp4",
    actorAuthUserId: "actor-123",
    mediaType: "video",
  });

  assert.equal(owned, true);
});

test("finalize ownership check rejects a path belonging to a different actor", () => {
  const owned = isOwnedAdvertisementMediaPath({
    mediaUrl: "someone-else/video/1699999999-abc-recruitment-ad.mp4",
    actorAuthUserId: "actor-123",
    mediaType: "video",
  });

  assert.equal(owned, false);
});

test("finalize ownership check rejects a path missing the declared media type segment", () => {
  const owned = isOwnedAdvertisementMediaPath({
    mediaUrl: "actor-123/1699999999-abc-recruitment-ad.mp4",
    actorAuthUserId: "actor-123",
    mediaType: "video",
  });

  assert.equal(owned, false);
});

test("admin advertisement upload route no longer reads a raw media body", () => {
  const routeSource = readRepoFile("src/app/api/admin/advertisements/upload/route.ts");

  // Regression guard: this route previously read `request.formData()` and
  // buffered the entire file into memory, which hits Vercel's platform-level
  // request body limit (~4.5MB) for any real video well before this app's
  // own 50MB video size validation is ever reached.
  assert.doesNotMatch(routeSource, /request\.formData\(\)/);
  assert.doesNotMatch(routeSource, /\.arrayBuffer\(\)/);
  assert.doesNotMatch(routeSource, /supabase\.storage\.from\(ADVERTISEMENT_BUCKET\)\.upload\(/);

  assert.match(routeSource, /authorizeAdvertisementMediaUpload/);
  assert.match(routeSource, /finalizeAdvertisementMediaUpload/);
  assert.match(routeSource, /requireRole\(auth, AD_ADMIN_ROLES\)/);
  assert.match(routeSource, /enforceCsrf\(request\)/);
});

test("admin signed-upload helper issues a signed URL and verifies the finalized object", () => {
  const helperSource = readRepoFile("src/lib/server/advertisements/signed-upload.ts");

  assert.match(helperSource, /createSignedUploadUrl\(/);
  assert.match(helperSource, /verifyAdvertisementMediaObjectExists/);
});

test("admin create-advertisement UI drives authorize -> direct upload -> finalize, not a raw multipart post", () => {
  const componentSource = readRepoFile(
    "src/features/advertisements/components/AdvertisementsAdminCenter.tsx"
  );

  assert.match(componentSource, /action:\s*"authorize"/);
  assert.match(componentSource, /action:\s*"finalize"/);
  assert.match(componentSource, /uploadToSignedUrl\(/);

  // The old flow built a FormData with the raw file and posted it directly;
  // that pattern must not come back.
  assert.doesNotMatch(componentSource, /uploadForm\.set\("file",\s*pendingFile\)/);

  // Advertisement creation must still be built from the finalize response.
  assert.match(componentSource, /media_type:\s*mediaType/);
  assert.match(componentSource, /media_url:\s*mediaUrl/);
});

test("employer advertisement upload flow is unchanged by the admin fix", () => {
  const employerRouteSource = readRepoFile("src/app/api/employers/advertisements/upload/route.ts");

  // Employer flow already used its own authorize/finalize signed-upload
  // implementation before this fix; it must still.
  assert.match(employerRouteSource, /createSignedUploadUrl\(/);
  assert.match(employerRouteSource, /verifyAdvertisementMediaObjectExists/);
  assert.match(employerRouteSource, /requireRole\(auth, \["employer", "admin", "super_admin"\]\)/);
});
