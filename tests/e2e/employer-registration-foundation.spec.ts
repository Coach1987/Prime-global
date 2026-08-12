import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

function readEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return new Map<string, string>();

  return new Map(
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator <= 0) return ["", ""] as const;
        return [
          line.slice(0, separator).trim(),
          line.slice(separator + 1).trim().replace(/^"|"$/g, "").replace(/^'|'$/g, ""),
        ] as const;
      })
  );
}

async function getCsrfToken(page: Page) {
  const response = await page.request.get("/api/security/csrf");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data?: { csrfToken?: string } };
  return String(payload.data?.csrfToken ?? "");
}

const env = readEnvLocal();
const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  env.get("SUPABASE_URL") ??
  env.get("NEXT_PUBLIC_SUPABASE_URL") ??
  "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const expectedSupabaseRef = process.env.E2E_EXPECTED_SUPABASE_REF;
const actualSupabaseRef = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/i.exec(supabaseUrl)?.[1];
const stagingSupabaseRef = "zppiiypjvzuoavxffdbj";
const productionSupabaseRef = "nqfcnkufpeevisfpjttu";

async function approveDisposableEmployerOnStaging(employerId: string) {
  if (actualSupabaseRef !== stagingSupabaseRef || actualSupabaseRef === productionSupabaseRef) {
    throw new Error(`Refusing approval fixture for Supabase ref: ${actualSupabaseRef ?? "unknown"}.`);
  }
  if (expectedSupabaseRef !== stagingSupabaseRef) {
    throw new Error(`Approval fixture requires E2E_EXPECTED_SUPABASE_REF=${stagingSupabaseRef}.`);
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(employerId)) {
    throw new Error("Approval fixture received an invalid employer id.");
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Approval fixture requires SUPABASE_ACCESS_TOKEN.");
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${stagingSupabaseRef}/database/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `update public.employers set verification_status = 'verified', verified_at = timezone('utc', now()) where id = '${employerId}' returning id;`,
    }),
  });

  const result = (await response.json()) as Array<{ id?: string }> | { message?: string };
  if (!response.ok || !Array.isArray(result) || result[0]?.id !== employerId) {
    throw new Error(`Staging approval fixture failed: ${JSON.stringify(result)}`);
  }
}

async function createDisposableForeignJobOnStaging(employerId: string) {
  if (actualSupabaseRef !== stagingSupabaseRef || actualSupabaseRef === productionSupabaseRef) {
    throw new Error(`Refusing foreign job fixture for Supabase ref: ${actualSupabaseRef ?? "unknown"}.`);
  }
  if (expectedSupabaseRef !== stagingSupabaseRef) {
    throw new Error(`Foreign job fixture requires E2E_EXPECTED_SUPABASE_REF=${stagingSupabaseRef}.`);
  }
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(employerId)) {
    throw new Error("Foreign job fixture received an invalid employer id.");
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Foreign job fixture requires SUPABASE_ACCESS_TOKEN.");
  }

  const response = await fetch(`https://api.supabase.com/v1/projects/${stagingSupabaseRef}/database/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: `insert into public.jobs (employer_id, title, department, employment_type, work_mode, country, city, experience, education, responsibilities, requirements, status) values ('${employerId}', 'Foreign isolation job', 'Engineering', 'full_time', 'remote', 'Tunisia', 'Tunis', 'Two years', 'Bachelor degree', 'Maintain isolated test systems.', 'Relevant engineering experience.', 'draft') returning id;`,
    }),
  });

  const result = (await response.json()) as Array<{ id?: string }> | { message?: string };
  const jobId = Array.isArray(result) ? String(result[0]?.id ?? "") : "";
  if (!response.ok || !jobId) {
    throw new Error(`Staging foreign job fixture failed: ${JSON.stringify(result)}`);
  }
  return jobId;
}

if (expectedSupabaseRef && actualSupabaseRef !== expectedSupabaseRef) {
  throw new Error(`Supabase E2E target mismatch: expected ${expectedSupabaseRef}, received ${actualSupabaseRef ?? "unknown"}.`);
}

const hasSupabaseEnv = Boolean(supabaseUrl && serviceRole);
const admin = hasSupabaseEnv
  ? createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

test.describe.configure({ mode: "serial" });
test.skip(!hasSupabaseEnv, "Isolated Supabase credentials are required for employer registration E2E.");

test("public employer entry is available in EN/AR with RTL and accessible validation", async ({ page, context }) => {
  await context.clearCookies();

  await page.goto("/en/employers");
  await expect(page.getByRole("heading", { name: "Recruit with confidence on Prime Global" })).toBeVisible();

  await page.goto("/en/employers/register");
  await expect(page).toHaveURL(/\/en\/auth\?mode=signup&role=employer/);
  await expect(page.getByRole("heading", { name: "Employer Create Account" })).toBeVisible();

  await page.goto("/en/employers/login");
  await expect(page).toHaveURL(/\/en\/auth\?mode=signin&role=employer/);
  await expect(page.getByRole("heading", { name: "Employer Sign In" })).toBeVisible();

  await page.goto("/ar/employers");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "وظّف بثقة عبر برايم غلوبال" })).toBeVisible();

  await page.goto("/en/auth?mode=signup&role=employer");
  await page.locator("form").filter({ has: page.locator("#employer-register-confirmPassword") }).evaluate((form) => {
    const passwordInput = form.querySelector<HTMLInputElement>("#employer-register-password");
    const confirmInput = form.querySelector<HTMLInputElement>("#employer-register-confirmPassword");
    if (passwordInput && confirmInput) {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(passwordInput, "Password-one");
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
      setValue?.call(confirmInput, "Password-two");
      confirmInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  const confirmPassword = page.locator("#employer-register-confirmPassword");
  await expect(confirmPassword).toHaveAttribute("aria-invalid", "true");
  await expect(confirmPassword).toHaveAttribute("aria-describedby", "employer-register-confirmPassword-error");
  await expect(page.locator("#employer-register-confirmPassword-error")).toBeVisible();
});

test("registration session, pending policy, onboarding, and approval", async ({ page, context }) => {
  test.setTimeout(180_000);
  if (!admin) return;

  const legalTableProbe = await admin.from("legal_acceptance_events").select("id").limit(1);
  test.skip(
    legalTableProbe.error?.code === "PGRST205",
    "The configured Supabase test project is missing the existing legal_acceptance_events migration."
  );
  expect(legalTableProbe.error).toBeNull();

  const seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `foundation-${seed}@example.com`;
  const password = `P@ssw0rd-${seed}`;
  let userId = "";
  let employerId = "";
  let foreignEmployerId = "";

  await context.clearCookies();

  try {
    const csrfToken = await getCsrfToken(page);
    const registration = await page.request.post("/api/employers/auth/register", {
      headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
      data: {
        email,
        password,
        companyName: `Foundation Company ${seed}`,
        commercialRegistrationNumber: `FOUND-CR-${seed}`,
        taxNumber: `FOUND-TAX-${seed}`,
        country: "Tunisia",
        city: "Sousse",
        address: "Foundation Test Address 1",
        website: "https://example.com/foundation",
        companyEmail: email,
        hrContact: "Foundation Owner",
        phoneNumber: "+21620000000",
        industry: "Technology",
        companySize: "11-50",
        companyDescription: "A direct technology employer used only for isolated registration foundation testing.",
        acceptTermsOfService: true,
        acceptPrivacyPolicy: true,
        acceptEmployerAgreement: true,
      },
    });
    const registrationPayload = (await registration.json()) as {
      data?: { userId?: string };
      error?: { code?: string; message?: string };
      details?: { messageAr?: string };
    };
    expect(registration.status(), JSON.stringify(registrationPayload)).toBe(201);
    userId = String(registrationPayload.data?.userId ?? "");
    expect(userId).not.toBe("");

    const cookies = await context.cookies();
    expect(cookies.some((cookie) => cookie.name === "pg_access_token" && cookie.httpOnly)).toBeTruthy();
    expect(cookies.some((cookie) => cookie.name === "pg_refresh_token" && cookie.httpOnly)).toBeTruthy();

    const me = await page.request.get("/api/auth/me");
    const mePayload = (await me.json()) as { success?: boolean; data?: { role?: string; accountStatus?: string } };
    expect(mePayload.success).toBe(true);
    expect(mePayload.data?.role).toBe("employer");
    expect(mePayload.data?.accountStatus).toBe("pending_review");

    const employerResult = await admin.from("employers").select("id").eq("auth_user_id", userId).single();
    expect(employerResult.error).toBeNull();
    employerId = String(employerResult.data?.id ?? "");

    await page.goto("/en/employer/pending-approval");
    await expect(page.getByRole("heading", { name: "Your company account has been created" })).toBeVisible();
    await page.goto("/ar/employer/pending-approval");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "تم إنشاء حساب شركتك بنجاح" })).toBeVisible();

    const profileResponse = await page.request.get("/api/employers/profile");
    const profilePayload = (await profileResponse.json()) as { data?: { company_name?: string } };
    expect(profileResponse.ok()).toBeTruthy();
    expect(profilePayload.data?.company_name).toBe(`Foundation Company ${seed}`);
    expect((await page.request.get("/api/companies/verification")).ok()).toBeTruthy();

    await page.goto("/en/employers/company-profile");
    await expect(page.getByPlaceholder("Company name")).toHaveValue(`Foundation Company ${seed}`);
    await expect(page.getByText("The company information entered during registration is already loaded below.", { exact: false })).toBeVisible();

    const pendingJobs = await page.request.get("/api/employers/jobs");
    expect(pendingJobs.status()).toBe(403);
    await page.goto("/en/employers/dashboard");
    await expect(page).toHaveURL(/\/en\/employer\/pending-approval/);

    await approveDisposableEmployerOnStaging(employerId);

    const foreignEmployer = await admin.from("employers").insert({
      auth_user_id: crypto.randomUUID(),
      company_name: `Foreign Foundation Company ${seed}`,
      commercial_registration_number: `FOREIGN-CR-${seed}`,
      tax_number: `FOREIGN-TAX-${seed}`,
      country: "Tunisia",
      city: "Tunis",
      address: "Foreign Foundation Test Address 1",
      company_email: `foreign-${email}`,
      hr_contact: "Foreign Foundation Owner",
      phone_number: "+21621111111",
      industry: "Technology",
      company_size: "11-50",
      company_description: "A second direct employer used only to verify cross-employer job isolation.",
      verification_status: "verified",
    }).select("id").single();
    expect(foreignEmployer.error).toBeNull();
    foreignEmployerId = String(foreignEmployer.data?.id ?? "");
    const foreignJobId = await createDisposableForeignJobOnStaging(foreignEmployerId);

    const approvedJobs = await page.request.get("/api/employers/jobs");
    expect(approvedJobs.ok()).toBeTruthy();
    const approvedJobsPayload = (await approvedJobs.json()) as { data?: Array<{ id?: string; employer_id?: string }> };
    expect(approvedJobsPayload.data ?? []).not.toContainEqual(expect.objectContaining({ id: foreignJobId }));
    expect((approvedJobsPayload.data ?? []).every((job) => job.employer_id === employerId)).toBe(true);
    await page.goto("/en/employers/dashboard");
    await expect(page.getByRole("heading", { name: `Welcome, Foundation Company ${seed}` })).toBeVisible();
  } finally {
    if (userId) {
      await admin.from("legal_acceptance_events").delete().eq("auth_user_id", userId);
    }
    if (employerId) {
      await admin.from("company_verification_requests").delete().eq("employer_id", employerId);
      await admin.from("employers").delete().eq("id", employerId);
    }
    if (foreignEmployerId) {
      await admin.from("employers").delete().eq("id", foreignEmployerId);
    }
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});