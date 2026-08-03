import fs from "node:fs";
import os from "node:os";
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
const employerA: SeedUser = {
  email: `employer-isolation-a-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  userId: "",
};
const employerB: SeedUser = {
  email: `employer-isolation-b-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  userId: "",
};
const employerReset: SeedUser = {
  email: `employer-reset-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  userId: "",
};
const adminUser: SeedUser = {
  email: `employer-admin-${seedTag}@example.com`,
  password: `P@ssw0rd-${seedTag}`,
  userId: "",
};
const seededAuthUserIds = new Set<string>();
const createdFilePath = path.join(os.tmpdir(), `prime-global-verification-${seedTag}.pdf`);

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

async function getCsrfToken(page: Page) {
  const response = await page.request.get("/api/security/csrf");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data?: { csrfToken?: string } };
  const token = String(payload.data?.csrfToken ?? "");
  expect(token.length).toBeGreaterThan(10);
  return token;
}

async function login(page: Page, email: string, password: string, role: "employer" | "staff") {
  const csrfToken = await getCsrfToken(page);
  const response = await page.request.post("/api/auth/login", {
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
    },
    data: { email, password, role },
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

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  fs.writeFileSync(createdFilePath, Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"));

  const users = [
    { seedUser: employerA, role: "employer" },
    { seedUser: employerB, role: "employer" },
    { seedUser: employerReset, role: "employer" },
    { seedUser: adminUser, role: "super_admin" },
  ] as const;

  for (const entry of users) {
    const created = await admin.auth.admin.createUser({
      email: entry.seedUser.email,
      password: entry.seedUser.password,
      email_confirm: true,
      app_metadata: { app_role: entry.role },
      user_metadata: { app_role: entry.role },
    });

    if (created.error || !created.data.user?.id) {
      throw new Error(`Unable to create seed user ${entry.seedUser.email}`);
    }

    entry.seedUser.userId = created.data.user.id;
    seededAuthUserIds.add(entry.seedUser.userId);
  }

  const employerInsert = await admin
    .from("employers")
    .insert([
      {
        auth_user_id: employerA.userId,
        company_name: `Isolation Employer A ${seedTag}`,
        commercial_registration_number: `ISO-A-${seedTag}`,
        tax_number: `ISO-TAX-A-${seedTag}`,
        country: "Tunisia",
        city: "Tunis",
        address: "A Test Address",
        website: "https://example.com/a",
        company_email: employerA.email,
        hr_contact: "HR A",
        phone_number: "+21620000001",
        industry: "Technology",
        company_size: "11-50",
        company_description: "Employer A owns a job and must remain isolated from other employers.",
        verification_status: "verified",
      },
      {
        auth_user_id: employerB.userId,
        company_name: `Isolation Employer B ${seedTag}`,
        commercial_registration_number: `ISO-B-${seedTag}`,
        tax_number: `ISO-TAX-B-${seedTag}`,
        country: "Tunisia",
        city: "Sousse",
        address: "B Test Address",
        website: "https://example.com/b",
        company_email: employerB.email,
        hr_contact: "HR B",
        phone_number: "+21620000002",
        industry: "Technology",
        company_size: "11-50",
        company_description: "Employer B starts with zero jobs and pending review.",
        verification_status: "pending",
      },
    ])
    .select("id, auth_user_id")
    .returns<Array<{ id: string; auth_user_id: string }>>();

  if (employerInsert.error || !employerInsert.data) {
    throw new Error(`Unable to seed employers: ${employerInsert.error?.message ?? "unknown"}`);
  }

  for (const row of employerInsert.data) {
    if (row.auth_user_id === employerA.userId) employerA.employerId = row.id;
    if (row.auth_user_id === employerB.userId) employerB.employerId = row.id;
  }

  const seededJob = await admin.from("jobs").insert({
    employer_id: employerA.employerId,
    title: `Isolation Software Engineer ${seedTag}`,
    department: "Engineering",
    employment_type: "full_time",
    work_mode: "onsite",
    country: "Tunisia",
    city: "Tunis",
    salary_currency: "USD",
    experience: "3+ years",
    education: "Bachelor",
    required_skills: ["TypeScript"],
    responsibilities: "Build isolated employer portal flows without exposing another company's data.",
    requirements: "Understand tenant isolation and production-safe data handling requirements.",
    benefits: "Competitive package",
    status: "draft",
  });

  if (seededJob.error) {
    throw new Error(`Unable to seed job: ${seededJob.error.message}`);
  }
});

test.afterAll(async () => {
  if (employerA.employerId || employerB.employerId || employerReset.employerId) {
    const employerIds = [employerA.employerId, employerB.employerId, employerReset.employerId].filter(Boolean) as string[];
    if (employerIds.length > 0) {
      await admin.from("company_verification_requests").delete().in("employer_id", employerIds);
      await admin.from("jobs").delete().in("employer_id", employerIds);
      await admin.from("employers").delete().in("id", employerIds);
    }
  }

  for (const authUserId of seededAuthUserIds) {
    await admin.auth.admin.deleteUser(authUserId);
  }

  if (fs.existsSync(createdFilePath)) {
    fs.unlinkSync(createdFilePath);
  }
});

test("fresh employer sees isolated zero-state on desktop and mobile without inherited jobs", async ({ page }) => {
  const guards = attachClientErrorGuards(page);

  await login(page, employerB.email, employerB.password, "employer");

  await page.goto("/en/employers/dashboard");
  await expect(page.getByText("Command Center")).toBeVisible();
  await expect(page.getByText("Current Workflow Step")).toBeVisible();
  await expect(page.getByText(`Isolation Software Engineer ${seedTag}`)).toHaveCount(0);

  const jobsResponse = await page.request.get("/api/employers/jobs");
  expect(jobsResponse.ok()).toBeTruthy();
  const jobsPayload = await jobsResponse.json();
  const jobs = Array.isArray(jobsPayload?.data) ? jobsPayload.data : [];
  const hasForeignSeededJob = jobs.some((job: { title?: string }) => String(job?.title ?? "") === `Isolation Software Engineer ${seedTag}`);
  expect(hasForeignSeededJob).toBeFalsy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ar/employers/dashboard");
  await expect(page.getByText("بوابة الشركات")).toBeVisible();
  await expect(page.getByRole("button", { name: "فتح قائمة البوابة" })).toBeVisible();

  guards.assertClean();
  await logout(page);
});

test("reset-style employer can recreate company profile with same login and start clean", async ({ page }) => {
  const guards = attachClientErrorGuards(page);

  await login(page, employerReset.email, employerReset.password, "employer");
  await page.goto("/en/employers/company-profile");

  await expect(page.getByText("Complete your company profile to begin.")).toBeVisible();

  await page.getByPlaceholder("Commercial registration number").fill(`RESET-CR-${seedTag}`);
  await page.getByPlaceholder("Tax number").fill(`RESET-TAX-${seedTag}`);
  await page.getByPlaceholder("Company name").fill(`Reset Employer ${seedTag}`);
  await page.getByPlaceholder("Official company email").fill(employerReset.email);
  await page.getByPlaceholder("Country").fill("Tunisia");
  await page.getByPlaceholder("City").fill("Sfax");
  await page.getByPlaceholder("Address").fill("Reset Employer Address");
  await page.getByPlaceholder("Website").fill("https://example.com/reset");
  await page.getByPlaceholder("Responsible person").fill("Reset HR");
  await page.getByPlaceholder("Phone").fill("+21620000003");
  await page.getByPlaceholder("Industry").fill("Technology");
  await page.getByPlaceholder("Company size").fill("11-50");
  await page.getByPlaceholder("Company description").fill("Reset employer profile recreated after controlled cleanup for clean onboarding.");
  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/employers/profile") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Create Company Profile" }).click(),
  ]);

  expect(createResponse.ok()).toBeTruthy();
  await expect(page.getByText("Company profile created.")).toBeVisible();

  const employerLookup = await admin
    .from("employers")
    .select("id, verification_status, company_name")
    .eq("auth_user_id", employerReset.userId)
    .maybeSingle();

  expect(employerLookup.error).toBeNull();
  expect(employerLookup.data?.company_name).toBe(`Reset Employer ${seedTag}`);
  expect(employerLookup.data?.verification_status).toBe("pending");
  employerReset.employerId = String(employerLookup.data?.id ?? "");

  await page.goto("/en/employers/dashboard");
  await expect(page.getByText("Command Center")).toBeVisible();
  await expect(page.getByText("Current Workflow Step")).toBeVisible();

  guards.assertClean();
  await logout(page);
});

test("verification submission creates pending request with document and admin can see pending employer", async ({ page }) => {
  const guards = attachClientErrorGuards(page);

  await login(page, employerReset.email, employerReset.password, "employer");
  await page.goto("/en/employers/verification");
  await page.waitForURL((url) => url.pathname.endsWith("/en/employers/company-profile"), { timeout: 30_000 });
  await page.getByLabel("Registration documents").setInputFiles(createdFilePath);

  const [submitResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/companies/verification") && response.request().method() === "POST"),
    page.getByRole("button", { name: "Submit for Verification" }).click(),
  ]);

  expect(submitResponse.ok()).toBeTruthy();
  await expect(page.getByText("Verification submitted and now pending review.")).toBeVisible();
  await expect(page.getByText("Status: pending")).toBeVisible();

  const requestLookup = await admin
    .from("company_verification_requests")
    .select("id, status, employer_id")
    .eq("employer_id", employerReset.employerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  expect(requestLookup.error).toBeNull();
  expect(requestLookup.data?.status).toBe("pending");

  const documentLookup = await admin
    .from("company_verification_documents_v2")
    .select("id", { count: "exact", head: true })
    .eq("verification_request_id", String(requestLookup.data?.id ?? ""));
  expect(documentLookup.count ?? 0).toBeGreaterThan(0);

  await logout(page);
  await login(page, adminUser.email, adminUser.password, "staff");

  const adminResponse = await page.request.get(`/api/admin/employers?q=${encodeURIComponent(`Reset Employer ${seedTag}`)}`);
  expect(adminResponse.ok()).toBeTruthy();
  const adminPayload = (await adminResponse.json()) as { data?: Array<{ id: string; companyName: string; verificationStatus: string }> };
  expect(adminPayload.data?.some((entry) => entry.companyName === `Reset Employer ${seedTag}` && entry.verificationStatus === "pending")).toBeTruthy();

  guards.assertClean();
  await logout(page);
});