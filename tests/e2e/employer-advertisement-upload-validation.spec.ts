import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

type CreatedAdvertisement = {
  id: string;
  titleEn: string;
};

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

function pngLikeBuffer(size: number) {
  const buffer = Buffer.alloc(size, 0);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  signature.forEach((value, index) => {
    buffer[index] = value;
  });
  return buffer;
}

function webmLikeBuffer(size: number) {
  const buffer = Buffer.alloc(size, 0);
  const signature = Buffer.from("webm", "ascii");
  signature.copy(buffer, 0);
  return buffer;
}

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

async function apiLogin(page: Page, email: string, password: string, role: "employer") {
  const csrfToken = await getCsrfTokenViaPage(page);
  const response = await page.request.post("/api/auth/login", {
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaders(csrfToken),
    },
    data: { email, password, role },
  });
  expect(response.ok()).toBeTruthy();
}

async function apiDeleteAdvertisement(page: Page, advertisementId: string) {
  const csrfToken = await getCsrfTokenViaPage(page);
  const response = await page.request.delete(`/api/employers/advertisements/${advertisementId}`, {
    headers: csrfHeaders(csrfToken),
  });
  expect(response.ok()).toBeTruthy();
}

async function openNewAdvertisementForm(page: Page, locale: "en" | "ar", titleSuffix: string, mediaType: "image" | "video") {
  await page.goto(`/${locale}/employers/advertisements`);
  await page.getByRole("button", { name: locale === "ar" ? "إعلان جديد" : "New Advertisement" }).click();

  await page.getByLabel("Title (English)").fill(`Upload Validation ${titleSuffix}`);
  await page.getByLabel("Title (Arabic)").fill(`اختبار الرفع ${titleSuffix}`);
  await page.getByLabel("Description (English)").fill("Validated upload path for employer advertisement media.");
  await page.getByLabel("Description (Arabic)").fill("مسار رفع متحقق لوسائط إعلان صاحب العمل.");
  await page.getByLabel("CTA Text (English)").fill("Explore");
  await page.getByLabel("CTA Text (Arabic)").fill("استكشف");
  await page.getByLabel("Media Alt Text (English)").fill("Advertisement media");
  await page.getByLabel("Media Alt Text (Arabic)").fill("وسائط الإعلان");
  await page.getByLabel("Target URL").fill("https://primeglobal.pro/en/employers");
  await page.getByLabel("Display Priority").fill("15");
  await page.getByLabel("Media Type").selectOption(mediaType);
}

async function createAdvertisementWithMedia(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.getByLabel("Upload Media").setInputFiles(file);

  const [response] = await Promise.all([
    page.waitForResponse((candidate) => {
      if (candidate.request().method() !== "POST") return false;
      if (!candidate.url().includes("/api/employers/advertisements/upload")) return false;
      const body = candidate.request().postData() ?? "";
      return body.includes('"action":"finalize"');
    }),
    page.getByRole("button", { name: /Create Advertisement|Update Advertisement/ }).click(),
  ]);

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data?: { advertisement?: { id?: string; title_en?: string } } };
  const id = String(payload.data?.advertisement?.id ?? "");
  expect(id.length).toBeGreaterThan(10);
  await expect(page.getByText("Advertisement draft created.")).toBeVisible();

  return {
    id,
    titleEn: String(payload.data?.advertisement?.title_en ?? ""),
  } satisfies CreatedAdvertisement;
}

async function expectClientValidationFailure(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer } | string,
  expectedMessage: string
) {
  const uploadRequests: string[] = [];
  const listener = (request: { url: () => string; method: () => string }) => {
    if (request.method() === "POST" && request.url().includes("/api/employers/advertisements/upload")) {
      uploadRequests.push(request.url());
    }
  };

  page.on("request", listener);
  try {
    await page.getByLabel("Upload Media").setInputFiles(file);
    await expect(page.locator(`text=${expectedMessage}`).first()).toBeVisible();
    await expect(page.getByLabel("Upload Media")).toHaveClass(/border-red-400\/70/);

    await page.getByRole("button", { name: /Create Advertisement|Update Advertisement/ }).click();
    await expect(page.locator("p.text-red-300").first()).toBeVisible();

    expect(uploadRequests.length).toBe(0);
  } finally {
    page.off("request", listener);
  }
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
  email: `employer-upload-validation-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  companyName: `Employer Upload Validation ${seedTag}`,
  commercialRegistrationNumber: `CR-UP-${seedTag}`,
  taxNumber: `TX-UP-${seedTag}`,
};

const state = {
  employerUserId: "",
  createdAds: [] as string[],
};

test.describe.configure({ mode: "serial" });
test.skip(!hasSupabaseEnv, "Supabase runtime credentials are required in .env.local for upload validation E2E.");

test.beforeAll(async ({ request }) => {
  if (!admin) return;

  const csrfResponse = await request.get("/api/security/csrf");
  const csrfPayload = (await csrfResponse.json()) as { data?: { csrfToken?: string } };
  const csrfToken = String(csrfPayload?.data?.csrfToken ?? "");

  const registerResponse = await request.post("/api/employers/auth/register", {
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
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
      hrContact: "Upload Validation HR",
      phoneNumber: "+21620123456",
      industry: "Technology",
      companySize: "11-50",
      companyDescription: "Employer account for advertisement media upload validation.",
      acceptTermsOfService: true,
      acceptPrivacyPolicy: true,
      acceptEmployerAgreement: true,
    },
  });

  const registerPayload = (await registerResponse.json()) as { data?: { userId?: string } };
  expect(registerResponse.status(), JSON.stringify(registerPayload)).toBe(201);

  state.employerUserId = String(registerPayload?.data?.userId ?? "");
  expect(state.employerUserId.length).toBeGreaterThan(10);
});

test.afterAll(async () => {
  if (!admin) return;

  for (const adId of state.createdAds) {
    await admin.from("advertisements").delete().eq("id", adId);
  }

  if (state.employerUserId) {
    await admin.from("employers").delete().eq("auth_user_id", state.employerUserId);
    await admin.auth.admin.deleteUser(state.employerUserId);
  }
});

test("advertisement uploader validates limits and supports valid media", async ({ page, browserName }) => {
  test.setTimeout(600_000);

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  await apiLogin(page, employerIdentity.email, employerIdentity.password, "employer");

  const validCases: Array<{
    id: string;
    locale: "en";
    mediaType: "image" | "video";
    file: { name: string; mimeType: string; buffer: Buffer };
  }> = [
    { id: "small-valid-image", locale: "en", mediaType: "image", file: { name: "small.png", mimeType: "image/png", buffer: pngLikeBuffer(120 * 1024) } },
    { id: "medium-valid-image", locale: "en", mediaType: "image", file: { name: "medium.png", mimeType: "image/png", buffer: pngLikeBuffer(2 * 1024 * 1024) } },
    { id: "near-limit-image", locale: "en", mediaType: "image", file: { name: "near-limit.png", mimeType: "image/png", buffer: pngLikeBuffer(MAX_IMAGE_BYTES - 2048) } },
    { id: "small-valid-video", locale: "en", mediaType: "video", file: { name: "small.webm", mimeType: "video/webm", buffer: webmLikeBuffer(400 * 1024) } },
  ];

  for (const scenario of validCases) {
    await test.step(`valid upload succeeds: ${scenario.id} (${browserName})`, async () => {
      await openNewAdvertisementForm(page, scenario.locale, scenario.id, scenario.mediaType);
      const created = await createAdvertisementWithMedia(page, scenario.file);
      state.createdAds.push(created.id);
      await apiDeleteAdvertisement(page, created.id);
    });
  }

  await test.step("oversized image rejected before upload (EN)", async () => {
    await openNewAdvertisementForm(page, "en", "oversized-image", "image");
    await expectClientValidationFailure(
      page,
      {
        name: "oversized-image.png",
        mimeType: "image/png",
        buffer: pngLikeBuffer(MAX_IMAGE_BYTES + 1024),
      },
      "Image file is too large. Maximum allowed image size is 8MB."
    );
  });

  await test.step("near-limit video metadata is accepted by authorize endpoint", async () => {
    const csrfToken = await getCsrfTokenViaPage(page);
    const authorizeResponse = await page.request.post("/api/employers/advertisements/upload", {
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders(csrfToken),
      },
      data: {
        action: "authorize",
        locale: "en",
        fileName: "near-limit-authorize.webm",
        mimeType: "video/webm",
        sizeBytes: MAX_VIDEO_BYTES - 4096,
      },
    });

    const payload = await authorizeResponse.json();
    expect(authorizeResponse.ok(), JSON.stringify(payload)).toBeTruthy();
    expect(String(payload?.data?.mediaType ?? "")).toBe("video");
    expect(String(payload?.data?.mediaUrl ?? "").length).toBeGreaterThan(10);
    expect(String(payload?.data?.signedUploadToken ?? "").length).toBeGreaterThan(10);
  });

  await test.step("oversized video rejected before upload (EN)", async () => {
    await openNewAdvertisementForm(page, "en", "oversized-video", "video");

    const oversizedVideoPath = path.join(process.cwd(), "artifacts", "owner-portal-verification", `oversized-video-${seedTag}.webm`);
    fs.mkdirSync(path.dirname(oversizedVideoPath), { recursive: true });
    fs.writeFileSync(oversizedVideoPath, webmLikeBuffer(MAX_VIDEO_BYTES + 1024));

    try {
      await expectClientValidationFailure(
        page,
        oversizedVideoPath,
        "Video file is too large. Maximum allowed video size is 50MB."
      );
    } finally {
      if (fs.existsSync(oversizedVideoPath)) {
        fs.unlinkSync(oversizedVideoPath);
      }
    }
  });

  await test.step("unsupported type rejected before upload (EN)", async () => {
    await openNewAdvertisementForm(page, "en", "unsupported-file", "image");
    await expectClientValidationFailure(
      page,
      {
        name: "unsupported.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.alloc(64 * 1024, 0),
      },
      "Unsupported file format. Allowed: JPG, JPEG, PNG, WEBP, MP4, WEBM."
    );
  });

  await test.step("oversized image rejected with Arabic localized message", async () => {
    await openNewAdvertisementForm(page, "ar", "oversized-image-ar", "image");
    await expectClientValidationFailure(
      page,
      {
        name: "oversized-image-ar.png",
        mimeType: "image/png",
        buffer: pngLikeBuffer(MAX_IMAGE_BYTES + 1024),
      },
      "حجم الصورة كبير جداً. الحد الأقصى للصور هو 8MB."
    );
  });

  const joinedConsoleErrors = consoleErrors.join("\n");
  expect(/413|Payload Too Large/i.test(joinedConsoleErrors), joinedConsoleErrors).toBeFalsy();
});
