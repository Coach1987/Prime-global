import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { isAdvertisementPubliclyVisible, sortAdvertisementsForPublic } from "./public.ts";
import { moderateAdvertisementContent } from "./moderation.ts";
import { validateAdvertisementMedia } from "./upload.ts";

const repoRoot = "/workspaces/Prime-global";

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function fixtureAdvertisement(overrides = {}) {
  return {
    status: "active",
    moderation_status: "passed",
    starts_at: null,
    ends_at: null,
    priority: 100,
    created_at: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

test("public visibility requires active passed ads within schedule window", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  assert.equal(isAdvertisementPubliclyVisible(fixtureAdvertisement(), now), true);
  assert.equal(isAdvertisementPubliclyVisible(fixtureAdvertisement({ status: "paused" }), now), false);
  assert.equal(isAdvertisementPubliclyVisible(fixtureAdvertisement({ moderation_status: "failed" }), now), false);
  assert.equal(
    isAdvertisementPubliclyVisible(
      fixtureAdvertisement({ starts_at: "2026-07-20T13:00:00.000Z" }),
      now
    ),
    false
  );
  assert.equal(
    isAdvertisementPubliclyVisible(
      fixtureAdvertisement({ ends_at: "2026-07-20T11:59:59.000Z" }),
      now
    ),
    false
  );
});

test("public sorting prioritizes lower priority value then newest creation date", () => {
  const sorted = sortAdvertisementsForPublic([
    fixtureAdvertisement({ priority: 5, created_at: "2026-07-20T09:00:00.000Z", id: "c" }),
    fixtureAdvertisement({ priority: 1, created_at: "2026-07-20T08:00:00.000Z", id: "a" }),
    fixtureAdvertisement({ priority: 1, created_at: "2026-07-20T11:00:00.000Z", id: "b" }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["b", "a", "c"]
  );
});

test("moderation rejects malicious URLs and flags contact information", async () => {
  const malicious = await moderateAdvertisementContent({
    titleAr: "عرض",
    titleEn: "Offer",
    descriptionAr: "تفاصيل",
    descriptionEn: "Promo details",
    ctaTextAr: "ابدأ",
    ctaTextEn: "Start",
    targetUrl: "javascript:alert(1)",
    mediaMetadata: "banner",
  });

  assert.equal(malicious.status, "failed");
  assert.match(String(malicious.reason ?? ""), /Unsupported URL protocol|Suspicious URL scheme|Invalid target URL/);

  const contactBypass = await moderateAdvertisementContent({
    titleAr: "توظيف",
    titleEn: "Hiring",
    descriptionAr: "راسلنا على email@test.com",
    descriptionEn: "Contact us via email@test.com",
    ctaTextAr: "قدم الآن",
    ctaTextEn: "Apply",
    targetUrl: "https://primeglobal.tn/jobs",
    mediaMetadata: "banner",
  });

  assert.notEqual(contactBypass.status, "passed");
});

test("upload validation rejects invalid media signatures and insufficient image dimensions", () => {
  const fakeVideo = new File([Buffer.from("not-a-real-video")], "promo.mp4", { type: "video/mp4" });
  const fakeVideoResult = validateAdvertisementMedia(fakeVideo, Buffer.from("not-a-real-video"));
  assert.equal(fakeVideoResult.ok, false);
  assert.equal(fakeVideoResult.reasonKey, "invalid_file_signature");

  const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6rxj8AAAAASUVORK5CYII=";
  const tinyPngBuffer = Buffer.from(tinyPngBase64, "base64");
  const tinyPng = new File([tinyPngBuffer], "banner.png", { type: "image/png" });
  const tinyPngResult = validateAdvertisementMedia(tinyPng, tinyPngBuffer);
  assert.equal(tinyPngResult.ok, false);
  assert.equal(tinyPngResult.reasonKey, "invalid_image_dimensions");
});

test("admin API routes enforce authz and CSRF guards", () => {
  const listRoute = readRepoFile("src/app/api/admin/advertisements/route.ts");
  const detailRoute = readRepoFile("src/app/api/admin/advertisements/[advertisementId]/route.ts");
  const actionRoute = readRepoFile("src/app/api/admin/advertisements/[advertisementId]/actions/route.ts");
  const uploadRoute = readRepoFile("src/app/api/admin/advertisements/upload/route.ts");

  for (const routeSource of [listRoute, detailRoute, actionRoute, uploadRoute]) {
    assert.match(routeSource, /requireRole\(auth, AD_ADMIN_ROLES\)/);
  }

  for (const routeSource of [listRoute, detailRoute, actionRoute, uploadRoute]) {
    assert.match(routeSource, /enforceCsrf\(request\)/);
  }
});

test("employer advertisement routes exist for owned workflow", () => {
  const listRoute = readRepoFile("src/app/api/employers/advertisements/route.ts");
  const detailRoute = readRepoFile("src/app/api/employers/advertisements/[advertisementId]/route.ts");
  const actionRoute = readRepoFile("src/app/api/employers/advertisements/[advertisementId]/actions/route.ts");
  const uploadRoute = readRepoFile("src/app/api/employers/advertisements/upload/route.ts");

  for (const routeSource of [listRoute, detailRoute, actionRoute, uploadRoute]) {
    assert.match(routeSource, /requireRole\(auth, \["employer", "admin", "super_admin"\]\)/);
  }

  for (const routeSource of [listRoute, detailRoute, actionRoute, uploadRoute]) {
    assert.match(routeSource, /getEmployerByAuthUserId/);
  }
});

test("advertisements translations exist for EN and AR locales", () => {
  const en = JSON.parse(readRepoFile("messages/en.json"));
  const ar = JSON.parse(readRepoFile("messages/ar.json"));

  assert.ok(en.advertisements);
  assert.ok(en.advertisementsAdmin);
  assert.ok(ar.advertisements);
  assert.ok(ar.advertisementsAdmin);

  assert.equal(typeof en.advertisements.badge, "string");
  assert.equal(typeof ar.advertisements.badge, "string");
  assert.equal(typeof en.advertisementsAdmin.title, "string");
  assert.equal(typeof ar.advertisementsAdmin.title, "string");
});

test("homepage public advertisements query is pre-filtered and non-cached", () => {
  const repository = readRepoFile("src/lib/server/advertisements/repository.ts");
  const section = readRepoFile("src/components/sections/Advertisements/SponsoredAdvertisementsSection.tsx");

  assert.match(repository, /\.eq\("status", "active"\)/);
  assert.match(repository, /\.eq\("moderation_status", "passed"\)/);
  assert.match(section, /unstable_noStore as noStore/);
  assert.match(section, /noStore\(\)/);
});

test("advertisement routes enforce media existence before persisting or activating", () => {
  const employerCreateRoute = readRepoFile("src/app/api/employers/advertisements/route.ts");
  const employerEditRoute = readRepoFile("src/app/api/employers/advertisements/[advertisementId]/route.ts");
  const employerActionRoute = readRepoFile("src/app/api/employers/advertisements/[advertisementId]/actions/route.ts");
  const employerUploadRoute = readRepoFile("src/app/api/employers/advertisements/upload/route.ts");
  const adminCreateRoute = readRepoFile("src/app/api/admin/advertisements/route.ts");
  const adminEditRoute = readRepoFile("src/app/api/admin/advertisements/[advertisementId]/route.ts");
  const adminActionRoute = readRepoFile("src/app/api/admin/advertisements/[advertisementId]/actions/route.ts");
  const adminUploadRoute = readRepoFile("src/app/api/admin/advertisements/upload/route.ts");
  const repository = readRepoFile("src/lib/server/advertisements/repository.ts");

  for (const routeSource of [
    employerCreateRoute,
    employerEditRoute,
    employerActionRoute,
    adminCreateRoute,
    adminEditRoute,
    adminActionRoute,
  ]) {
    assert.match(routeSource, /verifyAdvertisementMediaObjectExists/);
    assert.match(routeSource, /AdvertisementMediaIntegrityError/);
  }

  for (const routeSource of [employerUploadRoute, adminUploadRoute]) {
    // Upload routes trust storage.upload() — no post-upload re-verification loop.
    assert.doesNotMatch(routeSource, /verifyAdvertisementMediaObjectExists/);
    assert.doesNotMatch(routeSource, /UPLOAD_NOT_CONFIRMED/);
    assert.match(routeSource, /supabase\.storage\.from\(ADVERTISEMENT_BUCKET\)\.upload\(/);
  }

  // Repository uses storage.list() — never .schema("storage") which is not exposed via PostgREST.
  assert.doesNotMatch(repository, /\.schema\("storage"\)/);
  assert.doesNotMatch(repository, /\.from\("objects"\)/);
  // storage.list() is spread across chained lines; check for each part separately.
  assert.match(repository, /supabase\.storage/);
  assert.match(repository, /\.list\(directory,/);
  assert.match(repository, /verifyAdvertisementMediaObjectExists\(entry\.media_url\)/);
});

test("advertisement media integrity migration enforces storage-object invariants", () => {
  const migration = readRepoFile("supabase/migrations/202608040001_advertisement_media_integrity_guards.sql");

  assert.match(migration, /create or replace function public\.assert_advertisement_media_integrity\(\)/);
  assert.match(migration, /before insert or update of media_url, status/);
  assert.match(migration, /from storage\.objects o/);
  assert.match(migration, /bucket_id = 'advertisement-media'/);
  assert.match(migration, /Cannot activate advertisement because media object is missing from storage\./);
  assert.match(migration, /prevent_deleting_referenced_advertisement_media/);
  assert.match(migration, /before delete\s+on storage\.objects/);
  assert.match(migration, /Cannot delete advertisement media object/);
  // Migration must NOT contain a broad DELETE of advertisements.
  assert.doesNotMatch(migration, /^delete from public\.advertisements/m);
  // Migration must retract orphans to draft instead of deleting.
  assert.match(migration, /update public\.advertisements/);
  assert.match(migration, /status\s+=\s+'draft'/);
  // Cleanup must precede trigger installation to avoid self-blocking.
  const cleanupPos = migration.indexOf("update public.advertisements");
  const triggerPos = migration.indexOf("create trigger trg_assert_advertisement_media_integrity");
  assert.ok(cleanupPos < triggerPos, "cleanup UPDATE must appear before trigger installation");
});
