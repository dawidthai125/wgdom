import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PW_BASE_URL || "https://www.wgdom.fun";

/** Chromium + emulacja mobile (WebKit na Windows w CI bywa problematyczny). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "e2e-happy-path",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
      testMatch: /(worker-admin-inspector-happy-path|jobs-mobile-layout)\.spec\.ts/,
      fullyParallel: false,
    },
    {
      name: "e2e-version-awareness",
      use: { browserName: "chromium", viewport: { width: 1280, height: 800 } },
      testMatch: /version-awareness\.spec\.ts/,
      fullyParallel: false,
    },
    {
      name: "desktop-chrome",
      use: { browserName: "chromium", viewport: { width: 1920, height: 1080 } },
      testMatch: /desktop-(smoke|layout)\.spec\.ts/,
    },
    {
      name: "iphone-se",
      use: { ...devices["iPhone SE"], browserName: "chromium" },
      testMatch: /mobile-(smoke|flows)\.spec\.ts/,
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
      testMatch: /mobile-(smoke|flows)\.spec\.ts/,
    },
  ],
});
