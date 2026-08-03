import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

type SeedUser = {
  email: string;
  password: string;
  userId: string;
  employerId?: string;
};

const seedTag = `${Date.now()}`;
const employerUser: SeedUser = {
  email: `employer-simplify-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  userId: "",
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
    if (value) return value;
  }
  return "";
}

const envMap = readEnvLocal();
const supabaseUrl = readEnvValue(envMap, "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRole = readEnvValue(envMap, "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE");
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseServiceRole);

const admin = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function getCsrfToken(page: Page) {
  const response = await page.request.get("/api/security/csrf");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data?: { csrfToken?: string } };
  const token = String(payload.data?.csrfToken ?? "");
  expect(token.length).toBeGreaterThan(10);
  return token;
}

async function loginEmployer(page: Page) {
  const csrfToken = await getCsrfToken(page);
  const response = await page.request.post("/api/auth/login", {
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    data: {
      email: employerUser.email,
      password: employerUser.password,
      role: "employer",
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function logout(page: Page) {
  const csrfToken = await getCsrfToken(page);
  const response = await page.request.post("/api/auth/logout", {
    headers: { "x-csrf-token": csrfToken },
  });
  expect(response.ok()).toBeTruthy();
}

function attachClientErrorGuards(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return {
    assertClean() {
      expect(consoleErrors, `Console errors: ${consoleErrors.join("\n")}`).toEqual([]);
      expect(pageErrors, `Page errors: ${pageErrors.join("\n")}`).toEqual([]);
    },
  };
}

async function assertShellLinksAndPages(page: Page, locale: "en" | "ar") {
  const expectedPaths = [
    `/${locale}/employers/dashboard`,
    `/${locale}/employers/company-profile`,
    `/${locale}/employers/jobs`,
    `/${locale}/employers/advertisements`,
    `/${locale}/employers/settings`,
  ];

  const header = page.locator("header").first();
  const hrefs = await header.locator("a").evaluateAll((nodes) => {
    return nodes.map((node) => node.getAttribute("href") ?? "").filter(Boolean);
  });

  const shellHrefs = hrefs.filter((href) => expectedPaths.includes(href));
  const uniqueShellHrefs = Array.from(new Set(shellHrefs));

  expect(uniqueShellHrefs).toEqual(expectedPaths);
  await expect(header.getByRole("link", { name: locale === "ar" ? "عرض الموقع العام" : "View public website" })).toBeVisible();
  await expect(header.getByRole("button", { name: locale === "ar" ? "تسجيل الخروج" : "Logout" })).toBeVisible();

  // Public job-seeker navigation must not appear on protected employer pages.
  await expect(header.getByRole("link", { name: locale === "ar" ? "خدماتنا" : "Services" })).toHaveCount(0);
  if (locale === "ar") {
    await expect(header.locator('a[href="/ar/careers"]')).toHaveCount(0);
  } else {
    await expect(header.getByRole("link", { name: "Careers" })).toHaveCount(0);
  }
  await expect(header.getByRole("link", { name: locale === "ar" ? "ابحث عن وظيفة" : "Find Jobs" })).toHaveCount(0);

  for (const route of expectedPaths) {
    const response = await page.request.get(route);
    expect(response).not.toBeNull();
    expect(response?.status(), `${route} status`).toBeLessThan(400);
    const html = await response.text();
    expect(html).not.toContain("nav.companyVerification");
    expect(html).not.toContain("nav.jobManagement");
    expect(html).not.toContain("nav.advertisements");
    expect(html).not.toContain("nav.candidateProfiles");
    expect(html).not.toContain("nav.workflow");
    expect(html).not.toContain("nav.supervisedConversations");
  }
}

test.describe.configure({ mode: "serial" });
test.skip(!hasSupabaseEnv, "Supabase runtime credentials are required in .env.local for employer simplification E2E.");

test.beforeAll(async () => {
  if (!admin) return;

  const createdUser = await admin.auth.admin.createUser({
    email: employerUser.email,
    password: employerUser.password,
    email_confirm: true,
    app_metadata: { app_role: "employer" },
    user_metadata: { app_role: "employer", full_name: `Employer Simplify ${seedTag}` },
  });

  if (createdUser.error || !createdUser.data.user?.id) {
    throw new Error(`Unable to create seed employer user: ${createdUser.error?.message ?? "unknown"}`);
  }

  employerUser.userId = createdUser.data.user.id;

  const employerInsert = await admin
    .from("employers")
    .insert({
      auth_user_id: employerUser.userId,
      company_name: `Employer Simplify ${seedTag}`,
      commercial_registration_number: `SIM-CR-${seedTag}`,
      tax_number: `SIM-TAX-${seedTag}`,
      country: "Tunisia",
      city: "Sousse",
      address: "Simplification Test Address",
      website: "https://example.com/simplify",
      company_email: employerUser.email,
      hr_contact: "Simplify HR",
      phone_number: "+21620001111",
      industry: "Technology",
      company_size: "11-50",
      company_description: "Employer portal simplification verification profile.",
      verification_status: "verified",
    })
    .select("id")
    .single();

  if (employerInsert.error || !employerInsert.data?.id) {
    throw new Error(`Unable to seed employer profile: ${employerInsert.error?.message ?? "unknown"}`);
  }

  employerUser.employerId = employerInsert.data.id;
});

test.afterAll(async () => {
  if (!admin) return;

  if (employerUser.employerId) {
    await admin.from("employers").delete().eq("id", employerUser.employerId);
  }

  if (employerUser.userId) {
    await admin.auth.admin.deleteUser(employerUser.userId);
  }
});

test("employer English desktop menu is simplified and all links resolve", async ({ page }) => {
  const guards = attachClientErrorGuards(page);

  await loginEmployer(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/employers/dashboard");

  const header = page.locator("header").first();
  await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Company Profile" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Jobs", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Advertisements" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Candidates" })).toHaveCount(0);

  await assertShellLinksAndPages(page, "en");

  guards.assertClean();
  await logout(page);
});

test("employer Arabic desktop menu is simplified and all links resolve", async ({ page }) => {
  const guards = attachClientErrorGuards(page);

  await loginEmployer(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ar/employers/dashboard");

  const header = page.locator("header").first();
  await expect(header.getByRole("link", { name: "لوحة الشركة" })).toBeVisible();
  await expect(header.getByRole("link", { name: "ملف الشركة" })).toBeVisible();
  await expect(header.getByRole("link", { name: "الوظائف" })).toBeVisible();
  await expect(header.getByRole("link", { name: "الإعلانات" })).toBeVisible();
  await expect(header.getByRole("link", { name: "الإعدادات" })).toBeVisible();
  await expect(header.getByRole("link", { name: "المترشحون" })).toHaveCount(0);

  await assertShellLinksAndPages(page, "ar");

  guards.assertClean();
  await logout(page);
});

test("employer mobile core routes render without horizontal overflow", async ({ page }) => {
  const guards = attachClientErrorGuards(page);

  await loginEmployer(page);
  await page.setViewportSize({ width: 390, height: 844 });

  const routes = [
    "/en/employers/dashboard",
    "/en/employers/company-profile",
    "/en/employers/jobs",
    "/en/employers/advertisements",
    "/en/employers/settings",
  ];

  for (const route of routes) {
    const response = await page.request.get(route);
    expect(response).not.toBeNull();
    expect(response?.status(), `${route} status`).toBeLessThan(400);
  }

  await page.goto("/en/employers/dashboard");

  const hasHorizontalOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });

  expect(hasHorizontalOverflow, "horizontal overflow at /en/employers/dashboard").toBeFalsy();

  await page.getByRole("button", { name: /Open portal menu|فتح قائمة البوابة/i }).click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Company Profile" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Advertisements" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View public website" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Careers" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Find Jobs" })).toHaveCount(0);

  guards.assertClean();
  await logout(page);
});
