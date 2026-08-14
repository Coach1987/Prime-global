// Publishes the Prime Global master recruitment video as an official,
// first-party advertisement by driving the EXISTING admin advertisement
// API end to end (upload -> create -> submit_review -> optional approve).
// It intentionally does not touch Supabase directly: reusing the real API
// routes means the existing upload validation, storage-object integrity
// checks, moderation, and audit logging all run exactly as they do for any
// other advertisement, and no second code path is introduced.
//
// Requires a running instance of this app and an authenticated admin
// session (role: prime_global_admin | prime_global_admin_admin | admin |
// super_admin).
//
// Usage:
//   PRIME_GLOBAL_BASE_URL="https://staging.primeglobal.pro" \
//   PRIME_GLOBAL_ADMIN_COOKIE="sb-access-token=...; sb-refresh-token=..." \
//   VIDEO_FILE_PATH="/path/to/prime-global-master-ad.mp4" \
//   node scripts/publish-official-recruitment-ad.mjs [--activate]
//
// --activate: after submit_review, also calls the "approve" action so the
// ad goes live immediately if (and only if) moderation passed. Omit this
// flag to leave the ad at pending_review for a human admin to approve
// through the existing admin advertisements dashboard.

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

function readEnv(name, { required = true } = {}) {
  const value = process.env[name]?.trim();
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const BASE_URL = readEnv("PRIME_GLOBAL_BASE_URL").replace(/\/$/, "");
const ADMIN_COOKIE = readEnv("PRIME_GLOBAL_ADMIN_COOKIE");
const VIDEO_FILE_PATH = readEnv("VIDEO_FILE_PATH");
const SHOULD_ACTIVATE = process.argv.includes("--activate");

const AD_PAYLOAD = {
  title_en: "Prime Global — Your Talent. Your Future.",
  title_ar: "برايم غلوبال — موهبتك. مستقبلك.",
  description_en:
    "Discover international career opportunities across healthcare, engineering, fitness, hospitality, and more. Create your professional profile and take the next step toward your future with Prime Global.",
  description_ar:
    "اكتشف فرصًا مهنية دولية في الرعاية الصحية والهندسة واللياقة البدنية والضيافة وغيرها. أنشئ ملفك المهني وابدأ خطوتك التالية نحو مستقبلك مع برايم غلوبال.",
  media_alt_en:
    "Prime Global recruitment campaign video showing international career opportunities across healthcare, engineering, fitness, and hospitality.",
  media_alt_ar:
    "فيديو الحملة الترويجية لبرايم غلوبال يعرض فرصًا مهنية دولية في الرعاية الصحية والهندسة واللياقة البدنية والضيافة.",
  // Deliberately host-only + query, no locale segment: SponsoredAdvertisementsCarousel
  // resolves this through next-intl's locale-aware Link, so it renders as
  // /en/auth?... or /ar/auth?... depending on the viewer's locale.
  target_url: "REPLACE_WITH_SITE_URL/auth?mode=register&audience=candidate",
  cta_text_en: "Create Your Profile",
  cta_text_ar: "أنشئ ملفك الآن",
  priority: 100,
};

async function fetchJson(path, init) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      cookie: ADMIN_COOKIE,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} failed (${response.status}): ${payload?.error?.message ?? "unknown error"}`
    );
  }

  return payload.data;
}

async function main() {
  console.log(`Publishing official recruitment ad against ${BASE_URL}`);

  const { csrfToken } = await fetchJson("/api/security/csrf");

  const videoBuffer = await readFile(VIDEO_FILE_PATH);
  const form = new FormData();
  form.set("mediaType", "video");
  form.set("file", new Blob([videoBuffer], { type: "video/mp4" }), basename(VIDEO_FILE_PATH));

  console.log("Uploading video to the advertisement-media bucket...");
  const upload = await fetchJson("/api/admin/advertisements/upload", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: form,
  });
  console.log(`Uploaded: ${upload.mediaUrl} (${upload.sizeBytes} bytes, ${upload.mimeType})`);

  const siteUrl = new URL(BASE_URL).origin;
  const payload = {
    ...AD_PAYLOAD,
    media_type: upload.mediaType,
    media_url: upload.mediaUrl,
    target_url: AD_PAYLOAD.target_url.replace("REPLACE_WITH_SITE_URL", siteUrl),
  };

  console.log("Creating advertisement record...");
  const advertisement = await fetchJson("/api/admin/advertisements", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(payload),
  });
  console.log(`Created advertisement ${advertisement.id} (status: ${advertisement.status})`);

  console.log("Submitting for moderation review...");
  const submitted = await fetchJson(`/api/admin/advertisements/${advertisement.id}/actions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify({ action: "submit_review" }),
  });
  console.log(`Status after submit_review: ${submitted.status} (moderation: ${submitted.moderation_status})`);

  if (submitted.moderation_status === "failed") {
    console.error(`Moderation failed: ${submitted.moderation_reason ?? "see admin dashboard for details"}`);
    console.error("Not activating. Review and edit the advertisement in the admin advertisements dashboard.");
    return;
  }

  if (!SHOULD_ACTIVATE) {
    console.log(
      "Ad is at pending_review. Approve it from the admin advertisements dashboard, or re-run with --activate."
    );
    return;
  }

  console.log("Activating...");
  const activated = await fetchJson(`/api/admin/advertisements/${advertisement.id}/actions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify({ action: "approve" }),
  });
  console.log(`Final status: ${activated.status}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
