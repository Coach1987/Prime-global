import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser, type Locator, type Page, type TestInfo } from "@playwright/test";

type SeedUser = {
  email: string;
  password: string;
  fullName: string;
  userId: string;
  candidateId?: string;
  employerId?: string;
};

type SeedState = {
  tag: string;
  candidate: SeedUser;
  employer: SeedUser;
  owner: SeedUser;
  staff: SeedUser;
};

type CrashTelemetry = {
  testName: string;
  failingStep: string;
  finalUrl: string;
  consoleErrors: string[];
  pageErrors: string[];
  browserCrashReason: string;
  resourceIssue: string;
};

const seed: SeedState = {
  tag: `${Date.now()}`,
  candidate: { email: "", password: "", fullName: "", userId: "" },
  employer: { email: "", password: "", fullName: "", userId: "" },
  owner: { email: "", password: "", fullName: "", userId: "" },
  staff: { email: "", password: "", fullName: "", userId: "" },
};

function readEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
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

function requiredEnv(envMap: Map<string, string>, key: string) {
  const value = envMap.get(key) ?? "";
  if (!value) throw new Error(`Missing required env in .env.local: ${key}`);
  return value;
}

const envMap = readEnvLocal();
const supabaseUrl = requiredEnv(envMap, "SUPABASE_URL");
const supabaseServiceRole = requiredEnv(envMap, "SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function makeIdentity(prefix: string) {
  const safe = `${prefix}-${seed.tag}`;
  return {
    email: `${safe}@example.com`,
    password: `P@ssw0rd-${seed.tag}`,
    fullName: `${prefix.replace(/-/g, " ")} ${seed.tag}`,
  };
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

async function apiLogin(page: Page, email: string, password: string, role: "candidate" | "employer" | "staff") {
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

async function apiLogout(page: Page) {
  const csrfToken = await getCsrfTokenViaPage(page);
  const response = await page.request.post("/api/auth/logout", {
    headers: csrfHeaders(csrfToken),
  });
  expect(response.ok()).toBeTruthy();
}

async function uiLogin(page: Page, audience: "candidate" | "employer" | "staff", email: string, password: string, locale: "en" | "ar" = "en") {
  await page.goto(`/${locale}/auth?mode=signin&audience=${audience}`);
  const signInForm = page.locator("form").first();
  await signInForm.locator('input[type="email"]').fill(email);
  await signInForm.locator('input[type="password"]').fill(password);
  await signInForm.getByRole("button", { name: locale === "ar" ? "تسجيل الدخول" : "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 30_000 });
}

function createTelemetry(testName: string): CrashTelemetry {
  return {
    testName,
    failingStep: "",
    finalUrl: "",
    consoleErrors: [],
    pageErrors: [],
    browserCrashReason: "",
    resourceIssue: "",
  };
}

function attachTelemetryListeners(page: Page, telemetry: CrashTelemetry) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      telemetry.consoleErrors.push(msg.text());
      if (!telemetry.resourceIssue && /out of memory|insufficient resources|ERR_INSUFFICIENT_RESOURCES|oom/i.test(msg.text())) {
        telemetry.resourceIssue = msg.text();
      }
    }
  });

  page.on("pageerror", (error) => {
    const message = String(error?.message ?? "");
    telemetry.pageErrors.push(message);
    if (!telemetry.resourceIssue && /out of memory|insufficient resources|ERR_INSUFFICIENT_RESOURCES|oom/i.test(message)) {
      telemetry.resourceIssue = message;
    }
  });

  page.on("crash", () => {
    telemetry.browserCrashReason = "Playwright page crash event emitted";
  });
}

async function runStep(page: Page, telemetry: CrashTelemetry, stepName: string, fn: () => Promise<void>) {
  try {
    await test.step(stepName, fn);
  } catch (error) {
    telemetry.failingStep = stepName;
    telemetry.finalUrl = page.url();
    const message = String(error);
    if (!telemetry.browserCrashReason && /page crashed|target page, context or browser has been closed/i.test(message)) {
      telemetry.browserCrashReason = message;
    }
    if (!telemetry.resourceIssue && /out of memory|insufficient resources|ERR_INSUFFICIENT_RESOURCES|oom/i.test(message)) {
      telemetry.resourceIssue = message;
    }
    throw error;
  } finally {
    telemetry.finalUrl = page.url();
  }
}

async function attachTelemetry(testInfo: TestInfo, telemetry: CrashTelemetry) {
  await testInfo.attach("telemetry", {
    body: JSON.stringify(telemetry, null, 2),
    contentType: "application/json",
  });
}

async function assertUniqueHeaderLinks(scope: Locator) {
  const hrefs = await scope.locator("a").evaluateAll((nodes) => {
    return nodes
      .filter((node) => {
        const element = node as HTMLElement;
        const style = window.getComputedStyle(element);
        return element.getClientRects().length > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((node) => node.getAttribute("href") ?? "")
      .filter(Boolean);
  });

  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(href.includes("/en/en/") || href.includes("/ar/ar/")).toBeFalsy();
  }
}

function assertNoClientErrors(telemetry: CrashTelemetry, options?: { allowUnauthorizedConsole?: boolean }) {
  const filteredConsoleErrors = options?.allowUnauthorizedConsole
    ? telemetry.consoleErrors.filter((entry) => !/status of 401 \(Unauthorized\)/i.test(entry))
    : telemetry.consoleErrors;

  expect(filteredConsoleErrors, `Console errors: ${filteredConsoleErrors.join("\\n")}`).toEqual([]);
  expect(telemetry.pageErrors, `Page errors: ${telemetry.pageErrors.join("\n")}`).toEqual([]);
  expect(telemetry.browserCrashReason).toBe("");
}

async function withIsolatedPage(
  browser: Browser,
  testInfo: TestInfo,
  testName: string,
  run: (page: Page, telemetry: CrashTelemetry) => Promise<void>
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const telemetry = createTelemetry(testName);
  attachTelemetryListeners(page, telemetry);

  try {
    await run(page, telemetry);
  } finally {
    try {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch {
      // Ignore cleanup on pages that did not finish loading.
    }

    await context.clearCookies();
    await attachTelemetry(testInfo, telemetry);
    await context.close();
  }
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const candidateIdentity = makeIdentity("candidate");
  const employerIdentity = makeIdentity("employer");
  const ownerIdentity = makeIdentity("owner");
  const staffIdentity = makeIdentity("staff");

  seed.candidate = { ...candidateIdentity, userId: "" };
  seed.employer = { ...employerIdentity, userId: "" };
  seed.owner = { ...ownerIdentity, userId: "" };
  seed.staff = { ...staffIdentity, userId: "" };

  const createdCandidate = await admin.auth.admin.createUser({
    email: seed.candidate.email,
    password: seed.candidate.password,
    email_confirm: true,
    app_metadata: { app_role: "candidate" },
    user_metadata: { app_role: "candidate", full_name: seed.candidate.fullName },
  });
  const createdEmployer = await admin.auth.admin.createUser({
    email: seed.employer.email,
    password: seed.employer.password,
    email_confirm: true,
    app_metadata: { app_role: "employer" },
    user_metadata: { app_role: "employer", full_name: seed.employer.fullName },
  });
  const createdOwner = await admin.auth.admin.createUser({
    email: seed.owner.email,
    password: seed.owner.password,
    email_confirm: true,
    app_metadata: { app_role: "super_admin" },
    user_metadata: { app_role: "super_admin", full_name: seed.owner.fullName },
  });
  const createdStaff = await admin.auth.admin.createUser({
    email: seed.staff.email,
    password: seed.staff.password,
    email_confirm: true,
    app_metadata: { app_role: "prime_global_recruiter" },
    user_metadata: { app_role: "prime_global_recruiter", full_name: seed.staff.fullName },
  });

  if (createdCandidate.error || createdEmployer.error || createdOwner.error || createdStaff.error) {
    throw new Error("Unable to create seed users for post-login header regression suite");
  }

  seed.candidate.userId = String(createdCandidate.data.user?.id ?? "");
  seed.employer.userId = String(createdEmployer.data.user?.id ?? "");
  seed.owner.userId = String(createdOwner.data.user?.id ?? "");
  seed.staff.userId = String(createdStaff.data.user?.id ?? "");

  const candidateUpsert = await admin
    .from("candidate_profiles")
    .upsert(
      {
        auth_user_id: seed.candidate.userId,
        full_name: seed.candidate.fullName,
        email: seed.candidate.email,
        phone_number: "+21612345678",
        country: "Tunisia",
        city: "Sousse",
        professional_title: "Senior QA Engineer",
      },
      { onConflict: "auth_user_id" }
    )
    .select("id")
    .single();

  if (candidateUpsert.error || !candidateUpsert.data?.id) {
    throw new Error(`Unable to seed candidate profile: ${candidateUpsert.error?.message ?? "unknown"}`);
  }
  seed.candidate.candidateId = candidateUpsert.data.id;

  const employerInsert = await admin
    .from("employers")
    .insert({
      auth_user_id: seed.employer.userId,
      company_name: `Employer ${seed.tag}`,
      commercial_registration_number: `CR-${seed.tag}`,
      tax_number: `TAX-${seed.tag}`,
      country: "Tunisia",
      city: "Sousse",
      address: "Sousse Test Address",
      website: "https://example.com",
      company_email: seed.employer.email,
      hr_contact: "HR Employer",
      phone_number: "+21620000001",
      industry: "Technology",
      company_size: "11-50",
      company_description: "Employer profile for post-login header verification.",
      verification_status: "verified",
    })
    .select("id")
    .single();

  if (employerInsert.error || !employerInsert.data?.id) {
    throw new Error(`Unable to seed employer profile: ${employerInsert.error?.message ?? "unknown"}`);
  }
  seed.employer.employerId = employerInsert.data.id;
});

test.afterAll(async () => {
  if (seed.candidate.candidateId) {
    await admin.from("candidate_profiles").delete().eq("id", seed.candidate.candidateId);
  }

  if (seed.employer.employerId) {
    await admin.from("employers").delete().eq("id", seed.employer.employerId);
  }

  const userIds = [seed.candidate.userId, seed.employer.userId, seed.owner.userId, seed.staff.userId].filter(Boolean);
  for (const userId of userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
});

test("Candidate post-login header", async ({ browser }, testInfo) => {
  await withIsolatedPage(browser, testInfo, "Candidate post-login header", async (page, telemetry) => {
    await runStep(page, telemetry, "Candidate login shows role menu immediately", async () => {
      await uiLogin(page, "candidate", seed.candidate.email, seed.candidate.password, "en");

      const header = page.locator("header").first();
      await expect(header.getByText("Sign In")).toHaveCount(0);
      await expect(header.getByText("Create Account")).toHaveCount(0);

      const accountButton = header.getByRole("button", { name: seed.candidate.fullName });
      await expect(accountButton).toBeVisible();

      await accountButton.hover();
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Career Profile" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Applications" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Interviews" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Notifications" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Settings" })).toBeVisible();
      await expect(header.getByRole("button", { name: "Logout" })).toBeVisible();

      await expect(header.getByRole("link", { name: "Dashboard" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Career Profile" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Applications" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Interviews" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Notifications" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Settings" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Company Profile" })).toHaveCount(0);
      await assertUniqueHeaderLinks(header);

      await accountButton.click();
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeHidden();
      await accountButton.click();
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();

      await accountButton.focus();
      await page.keyboard.press("Escape");
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeHidden();
      await page.keyboard.press("Enter");
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await page.mouse.click(4, 4);
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeHidden();
    });

    await runStep(page, telemetry, "Candidate mobile tap behavior remains stable", async () => {
      const header = page.locator("header").first();
      await page.setViewportSize({ width: 390, height: 844 });
      const mobileMenuToggle = header.getByRole("button", { name: /Open menu|Close menu/i });
      await mobileMenuToggle.click();

      const mobileAccountButton = page.getByRole("button", { name: seed.candidate.fullName });
      await expect(mobileAccountButton).toBeVisible();
      await mobileAccountButton.click();

      const mobileDashboardLink = page.getByRole("link", { name: "Dashboard" });
      await expect(mobileDashboardLink).toBeVisible();
      await expect(mobileDashboardLink).toHaveCount(1);

      const mobileDialog = page.locator('[role="dialog"]');
      await assertUniqueHeaderLinks(mobileDialog);

      await page.keyboard.press("Escape");
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    assertNoClientErrors(telemetry, { allowUnauthorizedConsole: true });
  });
});

test("Employer post-login header", async ({ browser }, testInfo) => {
  await withIsolatedPage(browser, testInfo, "Employer post-login header", async (page, telemetry) => {
    await runStep(page, telemetry, "Employer login shows employer navigation only", async () => {
      await uiLogin(page, "employer", seed.employer.email, seed.employer.password, "en");
      await expect(page).toHaveURL(/\/en\/employers\/dashboard/);

      const header = page.locator("header").first();
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Company Profile" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Jobs", exact: true })).toBeVisible();
      await expect(header.getByRole("link", { name: "Advertisements" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Settings" })).toBeVisible();
      await expect(header.getByRole("link", { name: "View public website" })).toBeVisible();
      await expect(header.getByRole("button", { name: "Logout" })).toBeVisible();

      await expect(header.getByRole("link", { name: "Career Profile" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Applications" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Interviews" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Careers" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Find Jobs" })).toHaveCount(0);
      await expect(header.getByText("Sign In")).toHaveCount(0);
      await expect(header.getByText("Create Account")).toHaveCount(0);

      await expect(header.getByRole("link", { name: "Dashboard" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Company Profile" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Jobs", exact: true })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Advertisements" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Settings" })).toHaveCount(1);
      await assertUniqueHeaderLinks(header);
    });

    assertNoClientErrors(telemetry, { allowUnauthorizedConsole: true });
  });
});

test("Owner post-login header", async ({ browser }, testInfo) => {
  await withIsolatedPage(browser, testInfo, "Owner post-login header", async (page, telemetry) => {
    await runStep(page, telemetry, "Owner login has clean owner/staff menu with no stale role links", async () => {
      await apiLogin(page, seed.owner.email, seed.owner.password, "staff");
      await page.goto("/en/admin/control-center");

      const header = page.locator("header").first();
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Account" })).toBeVisible();
      await expect(header.getByRole("button", { name: "Logout" })).toBeVisible();

      await expect(header.getByRole("link", { name: "Company Profile" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Career Profile" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Applications" })).toHaveCount(0);

      await expect(header.getByRole("link", { name: "Dashboard" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Account" })).toHaveCount(1);
      await assertUniqueHeaderLinks(header);
    });

    assertNoClientErrors(telemetry);
  });
});

test("Staff post-login header", async ({ browser }, testInfo) => {
  await withIsolatedPage(browser, testInfo, "Staff post-login header", async (page, telemetry) => {
    await runStep(page, telemetry, "Staff login has clean staff menu with no stale role links", async () => {
      await apiLogin(page, seed.staff.email, seed.staff.password, "staff");
      await page.goto("/en/admin/control-center");

      const header = page.locator("header").first();
      await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(header.getByRole("link", { name: "Account" })).toBeVisible();
      await expect(header.getByRole("button", { name: "Logout" })).toBeVisible();

      await expect(header.getByRole("link", { name: "Company Profile" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Career Profile" })).toHaveCount(0);
      await expect(header.getByRole("link", { name: "Applications" })).toHaveCount(0);

      await expect(header.getByRole("link", { name: "Dashboard" })).toHaveCount(1);
      await expect(header.getByRole("link", { name: "Account" })).toHaveCount(1);
      await assertUniqueHeaderLinks(header);
    });

    assertNoClientErrors(telemetry);
  });
});

test("Logout and session reset", async ({ browser }, testInfo) => {
  await withIsolatedPage(browser, testInfo, "Logout and session reset", async (page, telemetry) => {
    await runStep(page, telemetry, "Logout returns to guest header and clears authenticated session", async () => {
      await uiLogin(page, "candidate", seed.candidate.email, seed.candidate.password, "en");

      const header = page.locator("header").first();
      const accountButton = header.getByRole("button", { name: seed.candidate.fullName });
      await expect(accountButton).toBeVisible();
      await accountButton.hover();
      await header.getByRole("button", { name: "Logout" }).click();

      await expect(header.getByText("Sign In")).toBeVisible();
      await expect(header.getByText("Create Account")).toBeVisible();
      await expect(header.getByRole("button", { name: seed.candidate.fullName })).toHaveCount(0);

      const me = await page.request.get("/api/auth/me");
      const payload = await me.json();
      expect([200, 401], JSON.stringify(payload)).toContain(me.status());
      expect(Boolean(payload?.success)).toBeFalsy();
      expect(String(payload?.error?.code ?? "")).toBe("UNAUTHENTICATED");
    });

    assertNoClientErrors(telemetry);
  });
});

test("Locale switching keeps header/session consistent", async ({ browser }, testInfo) => {
  await withIsolatedPage(browser, testInfo, "Locale switching keeps header/session consistent", async (page, telemetry) => {
    await runStep(page, telemetry, "Locale switch does not duplicate locale prefixes", async () => {
      await apiLogin(page, seed.candidate.email, seed.candidate.password, "candidate");

      await page.goto("/en/jobs");
      await expect(page.url()).not.toContain("/en/en/");
      const enHeader = page.locator("header").first();
      await expect(enHeader.getByRole("button", { name: seed.candidate.fullName })).toBeVisible();
      await assertUniqueHeaderLinks(enHeader);

      await page.goto("/ar/jobs");
      await expect(page.url()).not.toContain("/ar/ar/");
      const arHeader = page.locator("header").first();
      await expect(arHeader.getByRole("button", { name: seed.candidate.fullName })).toBeVisible();
      await assertUniqueHeaderLinks(arHeader);

      const arRequest = await page.request.get("/ar/jobs");
      expect(arRequest.ok()).toBeTruthy();
      expect(arRequest.url()).not.toContain("/ar/ar/");

      const enRequest = await page.request.get("/en/jobs");
      expect(enRequest.ok()).toBeTruthy();
      expect(enRequest.url()).not.toContain("/en/en/");
    });

    await runStep(page, telemetry, "Arabic login keeps immediate role header", async () => {
      await apiLogout(page);
      await uiLogin(page, "candidate", seed.candidate.email, seed.candidate.password, "ar");
      await expect(page.locator("header").first().getByRole("button", { name: seed.candidate.fullName })).toBeVisible();
    });

    assertNoClientErrors(telemetry);
  });
});
