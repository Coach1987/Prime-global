import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const shouldUseWebServer = process.env.PW_USE_WEBSERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: {
      args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
  webServer: shouldUseWebServer
    ? {
        command: "npm run dev -- --port 3100",
        url: `${baseURL}/en`,
        reuseExistingServer: true,
        timeout: 180_000,
      }
    : undefined,
});
