import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL || "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: ".tmp/theme-01c-local-verify/report.json" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
    viewport: { width: 1920, height: 1080 },
    browserName: "chromium",
  },
  projects: [
    {
      name: "theme-01c-local",
      testMatch: /theme-01c-local-verify\.spec\.ts/,
    },
  ],
});
