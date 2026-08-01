import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type ConsoleMessage, type Page } from "@playwright/test";

type ViewportPreset = {
  name: "desktop" | "mobile";
  width: number;
  height: number;
};

type SeedIdentity = {
  email: string;
  password: string;
  fullName: string;
};

type ConsoleEntry = {
  type: string;
  text: string;
  pageUrl: string;
};

type PageErrorEntry = {
  message: string;
  stack?: string;
  pageUrl: string;
};

type BadResponseEntry = {
  url: string;
  status: number;
  pageUrl: string;
};

type FailedRequestEntry = {
  url: string;
  method: string;
  errorText: string;
  pageUrl: string;
};

type DetailPayloadViolation = {
  url: string;
  missingFields: string[];
};

const OWNER_ROUTES = [
  "/admin/dashboard",
  "/admin/control-center",
  "/admin/recruitment",
  "/admin/candidate-profiles",
  "/admin/advertisements",
  "/admin/account",
] as const;

const OWNER_MENU_LINKS = [
  "/admin/dashboard",
  "/admin/control-center",
  "/admin/recruitment",
  "/admin/candidate-profiles",
  "/admin/advertisements",
  "/admin/account",
] as const;

const VIEWPORTS: ViewportPreset[] = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

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

function summarizeConsoleMessage(message: ConsoleMessage, pageUrl: string): ConsoleEntry {
  return {
    type: message.type(),
    text: message.text(),
    pageUrl,
  };
}

function isIgnoredConsoleNoise(entry: ConsoleEntry) {
  const text = entry.text.toLowerCase();

  if (text.includes("google-analytics.com")) return true;
  if (text.includes("googletagmanager.com")) return true;
  if (text.includes("chrome-extension://")) return true;
  if (text.includes("failed to fetch rsc payload") && text.includes("falling back to browser navigation")) return true;

  return false;
}

function hasActionableError(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("typeerror") ||
    normalized.includes("referenceerror") ||
    normalized.includes("chunkloaderror") ||
    normalized.includes("hydration") ||
    normalized.includes("did not match") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("application error: a client-side exception has occurred") ||
    normalized.includes("missing message") ||
    normalized.includes("next-intl")
  );
}

async function loginOwner(page: Page, locale: "en" | "ar", identity: SeedIdentity) {
  await page.goto(`/${locale}/admin/login`, { waitUntil: "domcontentloaded" });

  const csrfResponse = await page.request.get("/api/security/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrfPayload = (await csrfResponse.json()) as { data?: { csrfToken?: string } };
  const csrfToken = String(csrfPayload?.data?.csrfToken ?? "");
  expect(csrfToken.length).toBeGreaterThan(10);

  const loginResponse = await page.request.post("/api/auth/login", {
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    data: {
      email: identity.email,
      password: identity.password,
      role: "staff",
    },
  });

  const loginPayload = (await loginResponse.json()) as { success?: boolean; error?: { message?: string } };
  expect(loginResponse.ok(), loginPayload?.error?.message ?? "staff login failed").toBeTruthy();
  expect(loginPayload?.success).toBeTruthy();

  await page.goto(`/${locale}/admin/control-center`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/${locale}/admin/control-center`));
}

async function assertOwnerMenuPresent(page: Page, locale: "en" | "ar") {
  for (const route of OWNER_MENU_LINKS) {
    const href = `/${locale}${route}`;
    const candidateAnchors = page.locator(`a[href="${href}"]:visible`);
    await expect
      .poll(async () => candidateAnchors.count(), {
        message: `Expected owner navigation link ${href}`,
        timeout: 15_000,
      })
      .toBeGreaterThan(0);
  }
}

async function runLocaleSweep(browser: Browser, locale: "en" | "ar", viewport: ViewportPreset, identity: SeedIdentity) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    serviceWorkers: "block",
  });

  const page = await context.newPage();

  const consoleEntries: ConsoleEntry[] = [];
  const pageErrors: PageErrorEntry[] = [];
  const badResponses: BadResponseEntry[] = [];
  const failedRequests: FailedRequestEntry[] = [];
  const detailPayloadViolations: DetailPayloadViolation[] = [];

  page.on("console", (message) => {
    consoleEntries.push(summarizeConsoleMessage(message, page.url()));
  });

  page.on("pageerror", (error) => {
    pageErrors.push({
      message: error.message,
      stack: error.stack,
      pageUrl: page.url(),
    });
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText ?? "requestfailed",
      pageUrl: page.url(),
    });
  });

  page.on("response", async (response) => {
    const responseUrl = response.url();

    if (response.status() >= 400) {
      badResponses.push({
        url: responseUrl,
        status: response.status(),
        pageUrl: page.url(),
      });
    }

    const detailMatch = responseUrl.match(/\/api\/admin\/employers\/([0-9a-f-]{36})$/i);
    if (!detailMatch || response.status() !== 200) {
      return;
    }

    try {
      const payload = (await response.json()) as {
        success?: boolean;
        data?: Record<string, unknown>;
      };
      if (!payload?.success || !payload.data) {
        return;
      }

      const requiredArrayFields = [
        "jobs",
        "advertisements",
        "registrationDocuments",
        "taxDocuments",
        "verificationHistory",
        "activityTimeline",
      ];

      const missingFields = requiredArrayFields.filter((field) => !Array.isArray(payload.data?.[field]));
      if (missingFields.length > 0) {
        detailPayloadViolations.push({
          url: responseUrl,
          missingFields,
        });
      }
    } catch {
      return;
    }
  });

  await loginOwner(page, locale, identity);
  await assertOwnerMenuPresent(page, locale);

  await page.goto(`/${locale}/admin/control-center`, { waitUntil: "domcontentloaded" });
  await page.waitForResponse(
    (response) => /\/api\/admin\/employers\/[0-9a-f-]{36}$/i.test(response.url()) && response.status() === 200,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(300);

  for (const route of OWNER_ROUTES) {
    const targetPath = `/${locale}${route}`;
    const response = await page.goto(targetPath, { waitUntil: "domcontentloaded" });
    expect(response, `No response for ${targetPath}`).not.toBeNull();
    expect(response?.ok(), `Expected successful response for ${targetPath}`).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`/${locale}${route.replace("/", "\\/")}`));
    await assertOwnerMenuPresent(page, locale);

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.includes("Application error: a client-side exception has occurred")).toBeFalsy();

    const redirectLoopIndicator = page.url().match(new RegExp(`/${locale}/admin/login`, "g"));
    expect((redirectLoopIndicator ?? []).length).toBeLessThan(2);
  }

  const actionableConsoleErrors = consoleEntries.filter(
    (entry) => entry.type === "error" && !isIgnoredConsoleNoise(entry) && hasActionableError(entry.text)
  );
  const actionableWarnings = consoleEntries.filter(
    (entry) => entry.type === "warning" && hasActionableError(entry.text)
  );

  const admin404Responses = badResponses.filter(
    (entry) => entry.status === 404 && entry.url.includes("/admin")
  );

  const adminFailedRequests = failedRequests.filter((entry) => {
    if (!entry.url.includes("/admin") && !entry.url.includes("/_next/")) return false;
    if (entry.errorText.includes("ERR_ABORTED")) return false;
    return true;
  });

  const chunkFailures = [...consoleEntries, ...pageErrors].filter((entry) => {
    if ("text" in entry) {
      if (isIgnoredConsoleNoise(entry)) return false;
      return hasActionableError(entry.text);
    }
    return hasActionableError(entry.message);
  });

  expect(pageErrors, `${locale}/${viewport.name} page errors`).toEqual([]);
  expect(actionableConsoleErrors, `${locale}/${viewport.name} actionable console errors`).toEqual([]);
  expect(actionableWarnings, `${locale}/${viewport.name} actionable warnings`).toEqual([]);
  expect(admin404Responses, `${locale}/${viewport.name} admin 404 responses`).toEqual([]);
  expect(adminFailedRequests, `${locale}/${viewport.name} admin failed requests`).toEqual([]);
  expect(detailPayloadViolations, `${locale}/${viewport.name} employer detail payload contract`).toEqual([]);
  expect(chunkFailures, `${locale}/${viewport.name} chunk/hydration/intl/client exception indicators`).toEqual([]);

  await context.close();
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

const ownerIdentity: SeedIdentity = {
  email: `owner-crash-regression-${Date.now()}@example.com`,
  password: `P@ssw0rd-${Date.now()}`,
  fullName: `Owner Crash Regression ${Date.now()}`,
};

let ownerUserId = "";

test.describe.configure({ mode: "serial" });

test.skip(!hasSupabaseEnv, "Supabase service role credentials are required in .env.local for owner crash regression E2E.");

test.beforeAll(async () => {
  if (!admin) {
    return;
  }

  const createdOwner = await admin.auth.admin.createUser({
    email: ownerIdentity.email,
    password: ownerIdentity.password,
    email_confirm: true,
    app_metadata: { app_role: "admin" },
    user_metadata: { app_role: "admin", full_name: ownerIdentity.fullName },
  });

  if (createdOwner.error || !createdOwner.data.user) {
    throw new Error(`Unable to create owner seed user: ${createdOwner.error?.message ?? "unknown error"}`);
  }

  ownerUserId = createdOwner.data.user.id;
});

test.afterAll(async () => {
  if (!admin || !ownerUserId) {
    return;
  }

  await admin.auth.admin.deleteUser(ownerUserId);
});

for (const viewport of VIEWPORTS) {
  test(`owner routes avoid client exceptions (${viewport.name})`, async ({ browser }) => {
    for (const locale of ["en", "ar"] as const) {
      await runLocaleSweep(browser, locale, viewport, ownerIdentity);
    }
  });
}
