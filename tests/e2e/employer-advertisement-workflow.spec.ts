import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

function readEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return new Map<string, string>();
  }

  const text = fs.readFileSync(envPath, "utf8");
  const entries = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      if (idx <= 0) return ["", ""] as const;
      const key = line.slice(0, idx).trim();
      const rawValue = line.slice(idx + 1).trim();
      const value = rawValue.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      return [key, value] as const;
    });

  return new Map(entries);
}

function readEnvValue(envMap: Map<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = envMap.get(key) ?? "";
    if (value) {
      return value;
    }
  }

  return "";
}

const envMap = readEnvLocal();
const supabaseUrl = readEnvValue(envMap, "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRole = readEnvValue(envMap, "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE");
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseServiceRole);
const admin = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false },
    })
  : null;

const seedTag = `${Date.now()}`;
const employerIdentity = {
  email: `employer-ad-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  companyName: `Employer Ads ${seedTag}`,
  commercialRegistrationNumber: `CR-${seedTag}`,
  taxNumber: `TN-${seedTag}`,
};

const adminIdentity = {
  email: `staff-ad-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  fullName: `Staff Admin ${seedTag}`,
};

const workflowState = {
  employerUserId: "",
  employerId: "",
  advertisementId: "",
  advertisementMediaPath: "",
  advertisementTitle: `Global campaign ${seedTag}`,
  advertisementTarget: "https://primeglobal.pro/en/employers",
  adminUserId: "",
};

async function getCsrfTokenViaPage(page: Page) {
  const response = await page.request.get("/api/security/csrf");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data?: { csrfToken?: string } };
  const token = String(payload.data?.csrfToken ?? "");
  expect(token.length).toBeGreaterThan(10);
  return token;
}

function csrfHeaders(token: string) {
  return { "x-csrf-token": token };
}

async function apiLogout(page: Page) {
  const csrfToken = await getCsrfTokenViaPage(page);
  const response = await page.request.post("/api/auth/logout", {
    headers: csrfHeaders(csrfToken),
  });
  expect(response.ok()).toBeTruthy();
}

async function apiLogin(page: Page, email: string, password: string, role: "candidate" | "employer" | "staff") {
  const csrfToken = await getCsrfTokenViaPage(page);
  const response = await page.request.post("/api/auth/login", {
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(csrfToken),
    },
    data: {
      email,
      password,
      role,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function createPlayableVideoBuffer(page: Page) {
  const base64 = await page.evaluate(async () => {
    if (typeof MediaRecorder === "undefined") {
      throw new Error("MediaRecorder is unavailable in this browser context");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is unavailable");
    }

    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: Blob[] = [];
    const done = new Promise<string>((resolve, reject) => {
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener("error", () => reject(new Error("MediaRecorder failed")));
      recorder.addEventListener("stop", async () => {
        try {
          const blob = new Blob(chunks, { type: "video/webm" });
          const bytes = new Uint8Array(await blob.arrayBuffer());
          let binary = "";
          const sliceSize = 0x8000;
          for (let index = 0; index < bytes.length; index += sliceSize) {
            binary += String.fromCharCode(...bytes.subarray(index, index + sliceSize));
          }
          resolve(btoa(binary));
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });

    recorder.start(100);
    for (let frame = 0; frame < 18; frame += 1) {
      context.fillStyle = frame % 2 === 0 ? "#0b5fff" : "#04142b";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.font = "bold 28px sans-serif";
      context.fillText("PG", 24, 56);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    }

    recorder.stop();
    return done;
  });

  return Buffer.from(base64, "base64");
}

test.describe.configure({ mode: "serial" });
test.skip(!hasSupabaseEnv, "Supabase runtime credentials are required in .env.local for the employer advertisement workflow E2E.");

test.beforeAll(async () => {
  if (!admin) {
    return;
  }

  const createdAdmin = await admin.auth.admin.createUser({
    email: adminIdentity.email,
    password: adminIdentity.password,
    email_confirm: true,
    app_metadata: { app_role: "admin" },
    user_metadata: { app_role: "admin", full_name: adminIdentity.fullName },
  });

  if (createdAdmin.error || !createdAdmin.data.user) {
    throw new Error(`Unable to create admin seed user: ${createdAdmin.error?.message ?? "unknown error"}`);
  }

  workflowState.adminUserId = createdAdmin.data.user.id;
});

test.afterAll(async () => {
  if (!admin) {
    return;
  }

  if (workflowState.advertisementId) {
    await admin.from("advertisements").delete().eq("id", workflowState.advertisementId);
  }

  if (workflowState.employerId) {
    await admin.from("employers").delete().eq("id", workflowState.employerId);
  }

  for (const userId of [workflowState.employerUserId, workflowState.adminUserId].filter(Boolean)) {
    await admin.auth.admin.deleteUser(userId);
  }
});

test("employer advertisement workflow reaches admin moderation and public visibility", async ({ page }) => {
  await page.goto("/en");
  const playableVideoBuffer = await createPlayableVideoBuffer(page);

  const csrfToken = await getCsrfTokenViaPage(page);

  const registerResponse = await page.request.post("/api/employers/auth/register", {
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(csrfToken),
    },
    data: {
      email: employerIdentity.email,
      password: employerIdentity.password,
      companyName: employerIdentity.companyName,
      commercialRegistrationNumber: employerIdentity.commercialRegistrationNumber,
      taxNumber: employerIdentity.taxNumber,
      country: "Tunisia",
      city: "Tunis",
      address: "10 Prime Global Avenue, Tunis",
      website: "https://primeglobal.pro",
      companyEmail: employerIdentity.email,
      hrContact: "Amina Employer",
      phoneNumber: "+21620123456",
      industry: "Technology",
      companySize: "11-50",
      companyDescription: "Employer advertisement workflow company for end-to-end validation across registration and moderation.",
      acceptTermsOfService: true,
      acceptPrivacyPolicy: true,
      acceptEmployerAgreement: true,
    },
  });
  const registerPayload = await registerResponse.json();
  expect(registerResponse.status(), JSON.stringify(registerPayload)).toBe(201);
  workflowState.employerUserId = String(registerPayload?.data?.userId ?? "");
  expect(workflowState.employerUserId.length).toBeGreaterThan(10);

  if (!admin) {
    throw new Error("Supabase admin client is unavailable");
  }

  const employerLookup = await admin
    .from("employers")
    .select("id")
    .eq("auth_user_id", workflowState.employerUserId)
    .maybeSingle();
  expect(employerLookup.error, employerLookup.error?.message ?? "").toBeNull();
  workflowState.employerId = String(employerLookup.data?.id ?? "");
  expect(workflowState.employerId.length).toBeGreaterThan(10);

  await page.goto("/en/auth?mode=signin&audience=employer");
  const employerLoginForm = page.locator("form").first();
  await employerLoginForm.locator('input[type="email"]').fill(employerIdentity.email);
  await employerLoginForm.locator('input[type="password"]').fill(employerIdentity.password);
  await employerLoginForm.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 30_000 });

  await page.goto("/en/employers/advertisements");
  await page.getByRole("button", { name: "New Advertisement" }).click();
  await page.getByLabel("Title (English)").fill(workflowState.advertisementTitle);
  await page.getByLabel("Title (Arabic)").fill("حملة عالمية");
  await page.getByLabel("Description (English)").fill("Employer sponsored promotion for a verified Prime Global moderation workflow.");
  await page.getByLabel("Description (Arabic)").fill("إعلان ترويجي لصاحب العمل ضمن مسار مراجعة برايم غلوبال.");
  await page.getByLabel("CTA Text (English)").fill("Explore now");
  await page.getByLabel("CTA Text (Arabic)").fill("اكتشف الآن");
  await page.getByLabel("Media Alt Text (English)").fill("Employer advertisement banner");
  await page.getByLabel("Media Alt Text (Arabic)").fill("لافتة إعلان صاحب العمل");
  await page.getByLabel("Target URL").fill(workflowState.advertisementTarget);
  await page.getByLabel("Display Priority").fill("10");
  await page.getByLabel("Media Type").selectOption("video");
  await page.getByLabel("Upload Media").setInputFiles({
    name: "promo.webm",
    mimeType: "video/webm",
    buffer: playableVideoBuffer,
  });

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => {
      if (response.request().method() !== "POST") return false;
      if (response.status() !== 201) return false;
      const pathname = new URL(response.url()).pathname;
      return pathname.endsWith("/api/employers/advertisements");
    }),
    page.getByRole("button", { name: "Create Advertisement" }).click(),
  ]);
  expect(createResponse.ok()).toBeTruthy();
  const createPayload = await createResponse.json();
  workflowState.advertisementId = String(createPayload?.data?.id ?? "");
  expect(workflowState.advertisementId.length).toBeGreaterThan(10);
  workflowState.advertisementMediaPath = String(createPayload?.data?.media_url ?? "");
  expect(workflowState.advertisementMediaPath.length).toBeGreaterThan(10);

  const uploadedMediaExists = await admin.storage
    .from("advertisement-media")
    .createSignedUrl(workflowState.advertisementMediaPath, 60);
  expect(uploadedMediaExists.error, uploadedMediaExists.error?.message ?? "").toBeNull();
  expect(String(uploadedMediaExists.data?.signedUrl ?? "")).toContain("/storage/v1/object/sign/");

  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Advertisement submitted for Prime Global review.")).toBeVisible();

  await apiLogout(page);
  await apiLogin(page, adminIdentity.email, adminIdentity.password, "staff");

  const moderationQueueResponse = await page.request.get("/api/admin/advertisements?status=pending_review");
  const moderationQueuePayload = await moderationQueueResponse.json();
  expect(moderationQueueResponse.ok(), JSON.stringify(moderationQueuePayload)).toBeTruthy();
  const pendingAdvertisement = (moderationQueuePayload?.data ?? []).find(
    (item: { id?: string }) => String(item?.id ?? "") === workflowState.advertisementId
  );
  expect(pendingAdvertisement).toBeTruthy();

  const adminCsrfToken = await getCsrfTokenViaPage(page);
  const approveResponse = await page.request.post(`/api/admin/advertisements/${workflowState.advertisementId}/actions`, {
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(adminCsrfToken),
    },
    data: { action: "approve" },
  });
  const approvePayload = await approveResponse.json();
  expect(approveResponse.ok(), JSON.stringify(approvePayload)).toBeTruthy();
  expect(String(approvePayload?.data?.status ?? "")).toBe("active");

  const publicApiResponse = await page.request.get("/api/advertisements/public?locale=en");
  const publicApiPayload = await publicApiResponse.json();
  expect(publicApiResponse.ok(), JSON.stringify(publicApiPayload)).toBeTruthy();
  const visibleAdvertisement = (publicApiPayload?.data ?? []).find(
    (item: { id?: string; title?: string }) => String(item?.id ?? "") === workflowState.advertisementId || String(item?.title ?? "") === workflowState.advertisementTitle
  );
  expect(visibleAdvertisement).toBeTruthy();

  const employerOwnedEndpointFromAdmin = await page.request.get("/api/employers/advertisements");
  expect([403, 404]).toContain(employerOwnedEndpointFromAdmin.status());

  const publicHomepage = await page.request.get("/en");
  expect(publicHomepage.ok()).toBeTruthy();
  const publicHtml = await publicHomepage.text();
  expect(publicHtml).toContain(workflowState.advertisementTitle);

  await page.goto("/en");
  const homepageVideo = page.getByLabel("Employer advertisement banner");
  await homepageVideo.scrollIntoViewIfNeeded();
  await expect(homepageVideo).toBeVisible();
  await page.waitForFunction(() => {
    const video = document.querySelector('video[aria-label="Employer advertisement banner"]') as HTMLVideoElement | null;
    return Boolean(video && video.currentSrc && video.readyState >= 1);
  });

  await homepageVideo.evaluate(async (node) => {
    const video = node as HTMLVideoElement;
    await video.play();
  });

  const mediaState = await homepageVideo.evaluate((node) => {
    const video = node as HTMLVideoElement;
    return {
      currentSrc: video.currentSrc,
      paused: video.paused,
      readyState: video.readyState,
    };
  });
  expect(mediaState.currentSrc).toContain("/storage/v1/object/sign/");
  expect(mediaState.readyState).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => homepageVideo.evaluate((node) => (node as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  expect(mediaState.paused).toBe(false);
});