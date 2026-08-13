import { expect, test, type Page } from "@playwright/test";

function trackTourMutations(page: Page) {
  const mutations: string[] = [];
  page.on("request", (request) => {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method());
    const isProtectedSurface = /\/api\/(employers|companies\/verification|auth)/.test(request.url()) || request.url().includes("supabase.co");
    if (isMutation && isProtectedSurface) {
      mutations.push(`${request.method()} ${request.url()}`);
    }
  });
  return mutations;
}

test("interactive guide navigates, resumes, completes, replays, and never registers", async ({ page }) => {
  const registrationPosts = trackTourMutations(page);

  await page.goto("/en/employers");
  await page.getByRole("button", { name: "How to register your company" }).click();
  await expect(page.getByRole("dialog", { name: "See how company registration works" })).toBeVisible();
  await page.getByRole("button", { name: "Interactive Guide" }).click();
  await expect(page.getByRole("dialog", { name: "Create Account" })).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/\/en\/auth\?mode=signup&role=employer/);
  await expect(page.getByRole("dialog", { name: "Company Details" })).toBeVisible();

  await page.locator("#employer-register-companyName").fill("Tour Preview Company");
  await expect(page.getByRole("dialog", { name: "Verification" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("dialog", { name: "Pending Approval" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("dialog", { name: "Ready to Recruit" })).toBeVisible();
  await page.getByRole("button", { name: "Finish" }).click();

  await expect(page.getByRole("button", { name: "Replay tour" })).toBeVisible();
  await page.getByRole("button", { name: "Replay tour" }).click();
  await expect(page).toHaveURL(/\/en\/employers$/);
  await expect(page.getByRole("dialog", { name: "Create Account" })).toBeVisible();
  expect(registrationPosts).toEqual([]);
});

test("Escape skips the active guide", async ({ page }) => {
  await page.goto("/en/employers");
  await page.getByRole("button", { name: "How to register your company" }).click();
  await page.getByRole("button", { name: "Interactive Guide" }).click();
  await expect(page.getByRole("dialog", { name: "Create Account" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Create Account" })).toBeHidden();
});

test("Arabic demo fits a mobile RTL viewport with reduced motion and makes no registration request", async ({ page }) => {
  const registrationPosts = trackTourMutations(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/ar/employers");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "كيفية تسجيل شركتك" }).click();
  await page.getByRole("button", { name: "مشاهدة العرض" }).click();

  const dialog = page.getByRole("dialog", { name: "إنشاء الحساب" });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);

  await page.waitForTimeout(3500);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(registrationPosts).toEqual([]);
});

test("English Watch Demo autoplays a deterministic cinematic sequence without mutation", async ({ page }) => {
  const mutations = trackTourMutations(page);

  await page.goto("/en/employers?employerDemo=autoplay&demoSpeed=4");
  const tour = page.locator('[data-tour-mode="demo"]');
  await expect(tour).toHaveAttribute("data-demo-duration-ms", "49200");
  await expect(tour).toHaveAttribute("data-demo-step", "company", { timeout: 15_000 });
  await page.getByRole("button", { name: "Pause" }).click();

  const companyName = page.locator("#employer-register-companyName");
  await expect(companyName).toHaveValue("");
  await expect(page.getByTestId("demo-field-value")).toBeVisible();
  await expect(page.getByTestId("demo-pointer")).toBeVisible();

  await page.getByRole("button", { name: "Resume" }).click();
  await expect(tour).toHaveAttribute("data-demo-step", "pending", { timeout: 15_000 });
  await expect(page.getByTestId("demo-status-transition")).toBeVisible();
  await expect(tour).toHaveAttribute("data-demo-step", "ready", { timeout: 15_000 });
  await expect(page.getByTestId("approved-workspace-preview")).toBeVisible();
  await expect(companyName).toHaveValue("");
  expect(mutations).toEqual([]);
});

test("Arabic mobile Watch Demo uses rendered RTL targets and reduced-motion sequencing", async ({ page }) => {
  const mutations = trackTourMutations(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/ar/employers?employerDemo=autoplay&demoSpeed=8");
  const tour = page.locator('[data-tour-mode="demo"]');
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(tour).toHaveAttribute("data-demo-step", "company", { timeout: 15_000 });
  await expect(page.getByTestId("demo-pointer")).toHaveCount(0);
  await expect(page.getByTestId("demo-touch")).toHaveCount(0);

  const dialog = page.getByRole("dialog");
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await expect(tour).toHaveAttribute("data-demo-step", "ready", { timeout: 15_000 });
  await expect(page.getByTestId("approved-workspace-preview")).toBeVisible();
  expect(mutations).toEqual([]);
});

test("mobile Watch Demo uses a touch indicator instead of a desktop pointer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/employers?employerDemo=autoplay&demoSpeed=4");

  const tour = page.locator('[data-tour-mode="demo"]');
  await expect(tour).toHaveAttribute("data-demo-step", "company", { timeout: 15_000 });
  await expect(page.getByTestId("demo-touch")).toBeVisible();
  await expect(page.getByTestId("demo-pointer")).toHaveCount(0);
  await page.keyboard.press("Escape");
});