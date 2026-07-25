import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

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
  candidateA: SeedUser;
  candidateB: SeedUser;
  employerA: SeedUser;
  employerB: SeedUser;
  employerAJobId: string;
  employerAJobTitle: string;
  employerBJobId: string;
  candidateAApplicationId: string;
  candidateBApplicationId: string;
};

type SummaryState = {
  firstDestinationPathname: string;
  sawConsoleError: boolean;
  sawPageError: boolean;
  sawConsoleSensitiveError: boolean;
  sawChunkLoadError: boolean;
  sawJsonParseHtmlError: boolean;
};

const seed: SeedState = {
  tag: `${Date.now()}`,
  candidateA: { email: "", password: "", fullName: "", userId: "" },
  candidateB: { email: "", password: "", fullName: "", userId: "" },
  employerA: { email: "", password: "", fullName: "", userId: "" },
  employerB: { email: "", password: "", fullName: "", userId: "" },
  employerAJobId: "",
  employerAJobTitle: "",
  employerBJobId: "",
  candidateAApplicationId: "",
  candidateBApplicationId: "",
};

const summary: SummaryState = {
  firstDestinationPathname: "",
  sawConsoleError: false,
  sawPageError: false,
  sawConsoleSensitiveError: false,
  sawChunkLoadError: false,
  sawJsonParseHtmlError: false,
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
  if (!value) {
    throw new Error(`Missing required env in .env.local: ${key}`);
  }
  return value;
}

const envMap = readEnvLocal();
const supabaseUrl = requiredEnv(envMap, "SUPABASE_URL");
const supabaseServiceRole = requiredEnv(envMap, "SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});

async function getCsrfTokenViaPage(page: Page) {
  const response = await page.request.get("/api/security/csrf");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { data?: { csrfToken?: string } };
  const token = String(payload.data?.csrfToken ?? "");
  expect(token.length).toBeGreaterThan(10);
  return token;
}

function csrfHeaders(token: string) {
  return {
    "x-csrf-token": token,
  };
}

async function apiLogout(page: Page) {
  const csrfToken = await getCsrfTokenViaPage(page);
  const response = await page.request.post("/api/auth/logout", {
    headers: csrfHeaders(csrfToken),
  });
  expect(response.ok()).toBeTruthy();
}

function makeIdentity(prefix: string) {
  const safe = `${prefix}-${seed.tag}`;
  return {
    email: `${safe}@example.com`,
    password: `P@ssw0rd-${seed.tag}`,
    fullName: `${prefix.replace(/-/g, " ")} ${seed.tag}`,
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const candidateAIdentity = makeIdentity("candidate-a");
  const candidateBIdentity = makeIdentity("candidate-b");
  const employerAIdentity = makeIdentity("employer-a");
  const employerBIdentity = makeIdentity("employer-b");

  seed.candidateA = { ...candidateAIdentity, userId: "" };
  seed.candidateB = { ...candidateBIdentity, userId: "" };
  seed.employerA = { ...employerAIdentity, userId: "" };
  seed.employerB = { ...employerBIdentity, userId: "" };

  const createdCandidateA = await admin.auth.admin.createUser({
    email: seed.candidateA.email,
    password: seed.candidateA.password,
    email_confirm: true,
    app_metadata: { app_role: "candidate" },
    user_metadata: { app_role: "candidate", full_name: seed.candidateA.fullName },
  });
  const createdCandidateB = await admin.auth.admin.createUser({
    email: seed.candidateB.email,
    password: seed.candidateB.password,
    email_confirm: true,
    app_metadata: { app_role: "candidate" },
    user_metadata: { app_role: "candidate", full_name: seed.candidateB.fullName },
  });
  const createdEmployerA = await admin.auth.admin.createUser({
    email: seed.employerA.email,
    password: seed.employerA.password,
    email_confirm: true,
    app_metadata: { app_role: "employer" },
    user_metadata: { app_role: "employer", full_name: seed.employerA.fullName },
  });
  const createdEmployerB = await admin.auth.admin.createUser({
    email: seed.employerB.email,
    password: seed.employerB.password,
    email_confirm: true,
    app_metadata: { app_role: "employer" },
    user_metadata: { app_role: "employer", full_name: seed.employerB.fullName },
  });

  if (createdCandidateA.error || createdCandidateB.error || createdEmployerA.error || createdEmployerB.error) {
    throw new Error("Unable to create seed users for regression suite");
  }

  seed.candidateA.userId = String(createdCandidateA.data.user?.id ?? "");
  seed.candidateB.userId = String(createdCandidateB.data.user?.id ?? "");
  seed.employerA.userId = String(createdEmployerA.data.user?.id ?? "");
  seed.employerB.userId = String(createdEmployerB.data.user?.id ?? "");

  const candidateProfileUpsert = await admin
    .from("candidate_profiles")
    .upsert([
      {
        auth_user_id: seed.candidateA.userId,
        full_name: seed.candidateA.fullName,
        email: seed.candidateA.email,
        phone_number: "+21612345678",
        country: "Tunisia",
        city: "Sousse",
        professional_title: "Senior QA Engineer",
        bio: "Candidate A profile summary for regression testing with reliable detail coverage.",
      },
      {
        auth_user_id: seed.candidateB.userId,
        full_name: seed.candidateB.fullName,
        email: seed.candidateB.email,
        phone_number: "+21611111111",
        country: "Tunisia",
        city: "Tunis",
        professional_title: "QA Analyst",
        bio: "Candidate B profile for access-boundary testing.",
      },
    ], { onConflict: "auth_user_id" })
    .select("id, auth_user_id")
    .returns<Array<{ id: string; auth_user_id: string }>>();

  if (candidateProfileUpsert.error || !candidateProfileUpsert.data || candidateProfileUpsert.data.length < 2) {
    throw new Error("Unable to upsert candidate profiles");
  }

  for (const row of candidateProfileUpsert.data) {
    if (row.auth_user_id === seed.candidateA.userId) {
      seed.candidateA.candidateId = row.id;
    }
    if (row.auth_user_id === seed.candidateB.userId) {
      seed.candidateB.candidateId = row.id;
    }
  }

  const candidateAId = String(seed.candidateA.candidateId ?? "");
  const candidateBId = String(seed.candidateB.candidateId ?? "");
  if (!candidateAId || !candidateBId) {
    throw new Error("Missing candidate ids after profile upsert");
  }

  const employerInsert = await admin
    .from("employers")
    .insert([
      {
        auth_user_id: seed.employerA.userId,
        company_name: `Employer A ${seed.tag}`,
        commercial_registration_number: `CRA-${seed.tag}`,
        tax_number: `TAXA-${seed.tag}`,
        country: "Tunisia",
        city: "Sousse",
        address: "Sousse Test Address",
        website: "https://example.com/a",
        company_email: seed.employerA.email,
        hr_contact: "HR A",
        phone_number: "+21620000001",
        industry: "Technology",
        company_size: "11-50",
        company_description: "Verified employer A for regression tests.",
        verification_status: "verified",
      },
      {
        auth_user_id: seed.employerB.userId,
        company_name: `Employer B ${seed.tag}`,
        commercial_registration_number: `CRB-${seed.tag}`,
        tax_number: `TAXB-${seed.tag}`,
        country: "Tunisia",
        city: "Tunis",
        address: "Tunis Test Address",
        website: "https://example.com/b",
        company_email: seed.employerB.email,
        hr_contact: "HR B",
        phone_number: "+21620000002",
        industry: "Technology",
        company_size: "51-200",
        company_description: "Verified employer B for boundary tests.",
        verification_status: "verified",
      },
    ])
    .select("id, auth_user_id")
    .returns<Array<{ id: string; auth_user_id: string }>>();

  if (employerInsert.error || !employerInsert.data || employerInsert.data.length < 2) {
    throw new Error("Unable to insert employers");
  }

  for (const row of employerInsert.data) {
    if (row.auth_user_id === seed.employerA.userId) {
      seed.employerA.employerId = row.id;
    }
    if (row.auth_user_id === seed.employerB.userId) {
      seed.employerB.employerId = row.id;
    }
  }

  const candidateProfessionalUpsert = await admin.from("candidate_professional_profiles").upsert(
    {
      candidate_id: candidateAId,
      headline: "Senior QA Engineer",
      biography: "Experienced QA engineer specialized in end-to-end automation and platform reliability.",
      experiences: [{ role: "QA Engineer", company: "Prime Global", years: 6 }],
      education_entries: [{ degree: "BSc Computer Science", school: "University of Sousse" }],
      certificates: [{ title: "ISTQB" }],
      skills: ["Playwright", "TypeScript", "API Testing"],
      languages: ["English", "Arabic"],
      availability: "Immediate",
      nationality: "Tunisian",
    },
    { onConflict: "candidate_id" }
  );

  if (candidateProfessionalUpsert.error) {
    throw new Error(`Unable to upsert candidate professional profile: ${candidateProfessionalUpsert.error.message}`);
  }

  const resumeUpsert = await admin
    .from("candidate_resumes")
    .insert({
      candidate_id: candidateAId,
      storage_path: `seed/${seed.tag}/candidate-a-resume.pdf`,
      filename: "candidate-a-resume.pdf",
      mime_type: "application/pdf",
      size_bytes: 12345,
      is_primary: true,
    });

  if (resumeUpsert.error) {
    throw new Error(`Unable to seed candidate resume: ${resumeUpsert.error.message}`);
  }

  const privateProfileUpsert = await admin.from("candidate_private_profiles").upsert(
    [
      {
        candidate_id: candidateAId,
        full_name: seed.candidateA.fullName,
        email: seed.candidateA.email,
        phone: "+21612345678",
        address: "Sousse",
        original_cv_path: `private/${seed.tag}/candidate-a-original.pdf`,
        original_documents_paths: [`private/${seed.tag}/candidate-a-cert.pdf`],
        restricted_to_prime_global: true,
      },
      {
        candidate_id: candidateBId,
        full_name: seed.candidateB.fullName,
        email: seed.candidateB.email,
        phone: "+21611111111",
        address: "Tunis",
        original_cv_path: `private/${seed.tag}/candidate-b-original.pdf`,
        original_documents_paths: [`private/${seed.tag}/candidate-b-cert.pdf`],
        restricted_to_prime_global: true,
      },
    ],
    { onConflict: "candidate_id" }
  );

  if (privateProfileUpsert.error) {
    throw new Error(`Unable to seed private profile: ${privateProfileUpsert.error.message}`);
  }

  const publicProfileUpsert = await admin.from("candidate_public_profiles").upsert(
    [
      {
        candidate_id: candidateAId,
        professional_title: "Senior QA Engineer",
        professional_summary: "Public professional profile summary for candidate A.",
        years_of_experience: 6,
        skills: ["Playwright", "TypeScript", "API Testing"],
        employment_history: [{ title: "QA Engineer" }],
        education: [{ degree: "BSc Computer Science" }],
        certifications: [{ title: "ISTQB" }],
        languages: ["English", "Arabic"],
        general_location: "Sousse, Tunisia",
        availability: "Immediate",
        desired_role: "QA Lead",
        ai_summary: "Candidate A anonymized profile",
        profile_status: "approved",
      },
      {
        candidate_id: candidateBId,
        professional_title: "QA Analyst",
        professional_summary: "Public professional profile summary for candidate B.",
        years_of_experience: 3,
        skills: ["QA", "Regression"],
        employment_history: [{ title: "QA Analyst" }],
        education: [{ degree: "BSc" }],
        certifications: [{ title: "Testing Foundation" }],
        languages: ["English"],
        general_location: "Tunis, Tunisia",
        availability: "2 weeks",
        desired_role: "QA Analyst",
        ai_summary: "Candidate B anonymized profile",
        profile_status: "approved",
      },
    ],
    { onConflict: "candidate_id" }
  );

  if (publicProfileUpsert.error) {
    throw new Error(`Unable to seed public profile: ${publicProfileUpsert.error.message}`);
  }

  const { data: seededJobs, error: seededJobsError } = await admin
    .from("jobs")
    .insert([
      {
        employer_id: seed.employerA.employerId,
        title: `Regression Job ${seed.tag}`,
        department: "Quality Assurance",
        employment_type: "full_time",
        work_mode: "hybrid",
        country: "Tunisia",
        city: "Sousse",
        salary_min: 1500,
        salary_max: 2500,
        salary_currency: "USD",
        experience: "5+ years",
        education: "Bachelors",
        required_skills: ["Playwright", "TypeScript"],
        responsibilities: "Own quality strategy and lead release regression planning.",
        requirements: "Strong automation and API testing background.",
        benefits: "Health coverage",
        application_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "published",
        publish_date: new Date().toISOString(),
      },
      {
        employer_id: seed.employerB.employerId,
        title: `Boundary Job ${seed.tag}`,
        department: "Quality Assurance",
        employment_type: "full_time",
        work_mode: "onsite",
        country: "Tunisia",
        city: "Tunis",
        salary_min: 1200,
        salary_max: 2200,
        salary_currency: "USD",
        experience: "2+ years",
        education: "Bachelors",
        required_skills: ["QA"],
        responsibilities: "Run core QA operations with stable delivery and reporting discipline.",
        requirements: "Strong functional testing background and excellent communication skills.",
        benefits: "Standard benefits",
        application_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "published",
        publish_date: new Date().toISOString(),
      },
    ])
    .select("id, title, employer_id")
    .returns<Array<{ id: string; title: string; employer_id: string }>>();

  if (seededJobsError || !seededJobs || seededJobs.length < 2) {
    throw new Error(`Unable to seed jobs: ${seededJobsError?.message ?? "unknown"}`);
  }

  for (const row of seededJobs) {
    if (row.employer_id === seed.employerA.employerId) {
      seed.employerAJobId = row.id;
      seed.employerAJobTitle = row.title;
    }
    if (row.employer_id === seed.employerB.employerId) {
      seed.employerBJobId = row.id;
    }
  }

  if (!seed.employerAJobId || !seed.employerBJobId || !seed.employerAJobTitle) {
    throw new Error("Missing seeded jobs for regression suite");
  }

  const { data: appB, error: appBError } = await admin
    .from("job_applications_v2")
    .insert({
      job_id: seed.employerBJobId,
      candidate_id: seed.candidateB.candidateId,
      status: "new",
    })
    .select("id")
    .single();

  if (appBError) throw new Error(appBError.message);
  seed.candidateBApplicationId = String(appB?.id ?? "");
});

test.afterAll(async () => {
  const candidateIds = [seed.candidateA.candidateId, seed.candidateB.candidateId].filter(Boolean) as string[];
  const employerIds = [seed.employerA.employerId, seed.employerB.employerId].filter(Boolean) as string[];
  const userIds = [seed.candidateA.userId, seed.candidateB.userId, seed.employerA.userId, seed.employerB.userId].filter(Boolean);

  if (seed.candidateAApplicationId || seed.candidateBApplicationId) {
    await admin.from("job_application_status_events").delete().in("application_id", [seed.candidateAApplicationId, seed.candidateBApplicationId].filter(Boolean));
    await admin.from("job_applications_v2").delete().in("id", [seed.candidateAApplicationId, seed.candidateBApplicationId].filter(Boolean));
  }

  if (seed.employerAJobId || seed.employerBJobId) {
    await admin.from("jobs").delete().in("id", [seed.employerAJobId, seed.employerBJobId].filter(Boolean));
  }

  if (candidateIds.length > 0) {
    await admin.from("candidate_public_profiles").delete().in("candidate_id", candidateIds);
    await admin.from("candidate_private_profiles").delete().in("candidate_id", candidateIds);
    await admin.from("candidate_professional_profiles").delete().in("candidate_id", candidateIds);
    await admin.from("candidate_resumes").delete().in("candidate_id", candidateIds);
    await admin.from("candidate_profiles").delete().in("id", candidateIds);
  }

  if (employerIds.length > 0) {
    await admin.from("employers").delete().in("id", employerIds);
  }

  for (const userId of userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
});

test("targeted auth/application/privacy regression sweep", async ({ browser, page }) => {
  page.on("pageerror", (error) => {
    const text = String(error.message ?? "");
    summary.sawPageError = true;
    if (/ChunkLoadError/i.test(text)) summary.sawChunkLoadError = true;
    if (/Unexpected token < in JSON|Unexpected token '<'/i.test(text)) summary.sawJsonParseHtmlError = true;
    if (/password|token|secret|authorization/i.test(text)) summary.sawConsoleSensitiveError = true;
  });

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") summary.sawConsoleError = true;
    if (/ChunkLoadError/i.test(text)) summary.sawChunkLoadError = true;
    if (/Unexpected token < in JSON|Unexpected token '<'/i.test(text)) summary.sawJsonParseHtmlError = true;
    if (/password|token|secret|authorization/i.test(text) && msg.type() === "error") summary.sawConsoleSensitiveError = true;
  });

  let flowPage = page;

  await test.step("POST-LOGIN HEADER SYNCHRONIZATION without reload", async () => {
    await flowPage.goto("/en/auth?mode=signin&audience=candidate");
    const signInForm = flowPage.locator("form").first();
    await signInForm.locator('input[type="email"]').fill(seed.candidateA.email);
    await signInForm.locator('input[type="password"]').fill(seed.candidateA.password);
    await signInForm.getByRole("button", { name: "Sign In" }).click();

    await flowPage.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 30_000 });
    summary.firstDestinationPathname = new URL(flowPage.url()).pathname;

    const header = flowPage.locator("header").first();
    await expect(header.getByText("Sign In")).toHaveCount(0);
    await expect(header.getByText("Create Account")).toHaveCount(0);

    const accountButton = header.getByRole("button", { name: seed.candidateA.fullName });
    await expect(accountButton).toBeVisible();
    await expect(accountButton.locator("img, span").first()).toBeVisible();

    await accountButton.hover();
    await expect(header.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Career Profile" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Applications" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Interviews" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Notifications" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Logout" })).toBeVisible();

    const recoveredPage = await flowPage.context().newPage();
    await recoveredPage.goto("/en");
    await flowPage.close();
    flowPage = recoveredPage;
  });

  await test.step("Auth session regression: refresh/back-forward/second-tab/locale switch/en-en path", async () => {
    const header = flowPage.locator("header").first();

    await flowPage.goto("/en/jobs");
    await flowPage.goBack();
    await expect(header.getByRole("button", { name: seed.candidateA.fullName })).toBeVisible();
    await flowPage.goForward();
    await expect(header.getByRole("button", { name: seed.candidateA.fullName })).toBeVisible();

    await flowPage.reload();
    await expect(header.getByRole("button", { name: seed.candidateA.fullName })).toBeVisible();

    const secondTab = await flowPage.context().newPage();
    await secondTab.goto("/en/jobs");
    await expect(secondTab.locator("header").first().getByRole("button", { name: seed.candidateA.fullName })).toBeVisible();
    await secondTab.close();

    await flowPage.goto("/ar/jobs");
    await expect(flowPage.locator("header").first().getByRole("button", { name: seed.candidateA.fullName })).toBeVisible();
    expect(flowPage.url()).not.toContain("/en/en/");

    await flowPage.goto("/en/jobs");
    expect(flowPage.url()).not.toContain("/en/en/");
  });

  await test.step("Candidate profile completeness and route boundaries", async () => {
    await flowPage.goto("/en/candidate/profile");
    await expect(flowPage.locator("main").getByText(seed.candidateA.fullName, { exact: false }).first()).toBeVisible();
    await expect(flowPage.getByText("Senior QA Engineer").first()).toBeVisible();
    await expect(flowPage.getByText("Tunisia - Sousse", { exact: false })).toBeVisible();
    await expect(flowPage.getByText("Playwright", { exact: false })).toBeVisible();
    await expect(flowPage.getByText("TypeScript", { exact: false })).toBeVisible();
    await expect(flowPage.locator("main").getByText("Applications", { exact: true }).first()).toBeVisible();
    await expect(flowPage.locator("main").getByText("Interviews", { exact: true }).first()).toBeVisible();
    await expect(flowPage.locator("main").getByText("Notifications", { exact: true }).first()).toBeVisible();
    await expect(flowPage.getByRole("heading", { name: "Verification Notes" })).toBeVisible();
    await expect(flowPage.getByText("Current CV status", { exact: true })).toBeVisible();

    await expect(flowPage.locator("main input, main textarea, main select")).toHaveCount(0);

    await flowPage.goto("/en/candidate/settings");
    await expect(flowPage.getByRole("textbox", { name: "Email" })).toBeDisabled();
    await expect(flowPage.getByLabel("First name")).toBeEditable();
    await expect(flowPage).toHaveURL(/\/en\/candidate\/settings/);

    await flowPage.goto("/en/candidate/profile");
    await expect(flowPage).toHaveURL(/\/en\/candidate\/profile/);
  });

  await test.step("Candidate application journey and duplicate prevention", async () => {
    await flowPage.goto("/en/jobs");
    const jobCard = flowPage.locator("article").filter({ hasText: seed.employerAJobTitle }).first();
    await expect(jobCard).toBeVisible();
    await jobCard.getByRole("link", { name: "View Job" }).click();

    await expect(flowPage.getByText(seed.employerAJobTitle)).toBeVisible();
    await expect(flowPage.getByText("Application deadline", { exact: false })).toBeVisible();
    await expect(flowPage.getByText("Skills", { exact: false })).toBeVisible();
    await expect(flowPage.getByText("Playwright", { exact: false })).toBeVisible();
    await expect(flowPage.getByText("TypeScript", { exact: false })).toBeVisible();

    await flowPage.getByRole("button", { name: "Apply Now" }).click();
    await flowPage.getByRole("button", { name: "Submit Application" }).click();
    await expect(flowPage.getByText("submitted successfully", { exact: false })).toBeVisible();

    await flowPage.goto("/en/candidate/applications");
    const applicationCard = flowPage.locator("article").filter({ hasText: seed.employerAJobTitle }).first();
    await expect(applicationCard).toBeVisible();
    await expect(applicationCard.getByText("Employer A", { exact: false })).toBeVisible();
    await expect(applicationCard.getByText("Submitted", { exact: false })).toBeVisible();
    await applicationCard.getByRole("link", { name: "Open Details" }).click();

    await expect(flowPage.getByText("Status Timeline")).toBeVisible();
    await expect(flowPage.getByText("Related Notifications")).toBeVisible();
    seed.candidateAApplicationId = String(flowPage.url().split("/").pop() ?? "");
    expect(seed.candidateAApplicationId.length).toBeGreaterThan(10);

    await flowPage.goto(`/en/jobs/${seed.employerAJobId}`);
    await flowPage.getByRole("button", { name: "Apply Now" }).click();
    await expect(flowPage.getByText("already applied", { exact: false })).toBeVisible();
  });

  await test.step("Employer shortlist/interview/privacy gates", async () => {
    await apiLogout(flowPage);
    await flowPage.goto("/en/auth?mode=signin&audience=employer");

    const signInForm = flowPage.locator("form").first();
    await signInForm.locator('input[type="email"]').fill(seed.employerA.email);
    await signInForm.locator('input[type="password"]').fill(seed.employerA.password);
    await signInForm.getByRole("button", { name: "Sign In" }).click();
    await flowPage.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 30_000 });

    const applicantsResponse = await flowPage.request.get("/api/employers/applicants");
    const applicantsPayload = await applicantsResponse.json();
    expect(applicantsResponse.ok(), JSON.stringify(applicantsPayload)).toBeTruthy();
    expect(Boolean(applicantsPayload?.success)).toBeTruthy();

    const candidateApplication = (applicantsPayload?.data ?? []).find(
      (item: { id?: string }) => String(item?.id ?? "") === seed.candidateAApplicationId
    );

    expect(candidateApplication).toBeTruthy();
    const serialized = JSON.stringify(candidateApplication);
    expect(serialized.includes("phone")).toBeFalsy();
    expect(serialized.includes("email")).toBeFalsy();
    expect(serialized.includes("original_cv")).toBeFalsy();
    expect(serialized.includes("private/")).toBeFalsy();

    const blockedCvResponse = await flowPage.request.get(`/api/employers/applicants/${seed.candidateAApplicationId}/cv`);
    const blockedCvPayload = await blockedCvResponse.json();
    expect(blockedCvResponse.status(), JSON.stringify(blockedCvPayload)).toBe(403);

    const csrfToken = await getCsrfTokenViaPage(flowPage);
    const interviewBeforeShortlistResponse = await flowPage.request.post(
      `/api/employers/candidate-profiles/${seed.candidateA.candidateId}/interview-request?note=before_shortlist`,
      { headers: csrfHeaders(csrfToken) }
    );
    const interviewBeforeShortlistPayload = await interviewBeforeShortlistResponse.json();
    expect(interviewBeforeShortlistResponse.ok()).toBeFalsy();

    const shortlistResponse = await flowPage.request.patch(`/api/hr/applications/${seed.candidateAApplicationId}/status`, {
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders(csrfToken),
      },
      data: {
        status: "shortlisted",
        note: "shortlisted_by_regression_suite",
      },
    });
    const shortlistPayload = await shortlistResponse.json();
    expect(shortlistResponse.ok(), JSON.stringify(shortlistPayload)).toBeTruthy();

    const interviewAfterShortlistResponse = await flowPage.request.post(
      `/api/employers/candidate-profiles/${seed.candidateA.candidateId}/interview-request?note=after_shortlist`,
      { headers: csrfHeaders(csrfToken) }
    );
    const interviewAfterShortlistPayload = await interviewAfterShortlistResponse.json();
    expect(interviewAfterShortlistResponse.ok(), JSON.stringify(interviewAfterShortlistPayload)).toBeTruthy();

    const crossEmployerResponse = await flowPage.request.patch(`/api/hr/applications/${seed.candidateBApplicationId}/status`, {
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders(csrfToken),
      },
      data: {
        status: "shortlisted",
        note: "cross_employer_attempt",
      },
    });
    const crossEmployerPayload = await crossEmployerResponse.json();
    expect(crossEmployerResponse.status(), JSON.stringify(crossEmployerPayload)).toBe(404);

    expect(Boolean(interviewBeforeShortlistPayload)).toBeTruthy();
  });

  await test.step("Candidate notification, shortlist timeline, and security boundaries", async () => {
    await apiLogout(flowPage);
    await flowPage.goto("/en/auth?mode=signin&audience=candidate");
    const signin = flowPage.locator("form").first();
    await signin.locator('input[type="email"]').fill(seed.candidateA.email);
    await signin.locator('input[type="password"]').fill(seed.candidateA.password);
    await signin.getByRole("button", { name: "Sign In" }).click();
    await flowPage.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 30_000 });

    const detailResponse = await flowPage.request.get(`/api/candidates/applications/${seed.candidateAApplicationId}`);
    const detailPayload = await detailResponse.json();
    expect(detailResponse.ok(), JSON.stringify(detailPayload)).toBeTruthy();
    const statuses = (detailPayload?.data?.statusHistory ?? []).map((event: { next_status?: string }) => String(event.next_status ?? ""));
    expect(statuses.includes("shortlisted")).toBeTruthy();

    const notificationResponse = await flowPage.request.get("/api/notifications");
    const notificationPayload = await notificationResponse.json();
    expect(notificationResponse.ok(), JSON.stringify(notificationPayload)).toBeTruthy();
    const hasShortlistNotice = (notificationPayload?.data ?? []).some((item: { entity_id?: string; body?: string; title?: string }) => {
      return String(item.entity_id ?? "") === seed.candidateAApplicationId && /shortlist|Application updated/i.test(String(item.body ?? item.title ?? ""));
    });
    expect(hasShortlistNotice).toBeTruthy();

    await flowPage.goto(`/en/candidate/applications/${seed.candidateAApplicationId}`);
    await expect(
      flowPage.locator("article").filter({ hasText: "Shortlist Status" }).getByText("Shortlisted", { exact: true })
    ).toBeVisible();

    await flowPage.goto(`/ar/candidate/applications/${seed.candidateAApplicationId}`);
    await expect(flowPage).toHaveURL(/\/ar\/candidate\/applications\//);

    const forbiddenBApplication = await flowPage.request.get(`/api/candidates/applications/${seed.candidateBApplicationId}`);
    const forbiddenBPayload = await forbiddenBApplication.json();
    expect(forbiddenBApplication.status(), JSON.stringify(forbiddenBPayload)).toBe(404);

    const forbiddenAdminProfile = await flowPage.request.get(`/api/admin/candidate-profiles/${seed.candidateB.candidateId}`);
    expect([401, 403]).toContain(forbiddenAdminProfile.status());

    await apiLogout(flowPage);
    const unauthenticatedDetails = await flowPage.request.get(`/api/candidates/applications/${seed.candidateAApplicationId}`);
    const unauthenticatedPayload = await unauthenticatedDetails.json();
    expect(unauthenticatedDetails.status(), JSON.stringify(unauthenticatedPayload)).toBe(401);
  });

  await test.step("Logout restores guest header and Arabic login works", async () => {
    await flowPage.goto("/en/auth?mode=signin&audience=candidate");
    const form = flowPage.locator("form").first();
    await form.locator('input[type="email"]').fill(seed.candidateA.email);
    await form.locator('input[type="password"]').fill(seed.candidateA.password);
    await form.getByRole("button", { name: "Sign In" }).click();
    await flowPage.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 30_000 });

    const header = flowPage.locator("header").first();
    const accountButton = header.getByRole("button", { name: seed.candidateA.fullName });
    await accountButton.hover();
    await header.getByRole("button", { name: "Logout" }).click();
    await expect(header.getByText("Sign In")).toBeVisible();
    await expect(header.getByText("Create Account")).toBeVisible();

    await flowPage.goto("/ar/auth?mode=signin&audience=candidate");
    const arForm = flowPage.locator("form").first();
    await arForm.locator('input[type="email"]').fill(seed.candidateA.email);
    await arForm.locator('input[type="password"]').fill(seed.candidateA.password);
    await arForm.getByRole("button", { name: "تسجيل الدخول" }).click();
    await flowPage.waitForURL((url) => !url.pathname.endsWith("/auth"), { timeout: 30_000 });
    await expect(flowPage.locator("header").first().getByRole("button", { name: seed.candidateA.fullName })).toBeVisible();
  });

  expect(summary.firstDestinationPathname.length).toBeGreaterThan(1);
  expect(summary.sawConsoleError).toBeFalsy();
  expect(summary.sawPageError).toBeFalsy();
  expect(summary.sawChunkLoadError).toBeFalsy();
  expect(summary.sawJsonParseHtmlError).toBeFalsy();
  expect(summary.sawConsoleSensitiveError).toBeFalsy();
});
